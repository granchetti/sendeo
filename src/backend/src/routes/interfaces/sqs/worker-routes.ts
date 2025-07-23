import { SQSHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { request as httpsRequest, RequestOptions } from "node:https";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { Route } from "../../domain/entities/route-entity";
import { DistanceKm } from "../../domain/value-objects/distance-value-object";
import { Duration } from "../../domain/value-objects/duration-value-object";
import { Path } from "../../domain/value-objects/path-value-object";
import { UUID } from "../../domain/value-objects/uuid-value-object";
import { DynamoRouteRepository } from "../../infrastructure/dynamodb/dynamo-route-repository";
import { publishRoutesGenerated } from "../appsync-client";

const dynamo = new DynamoDBClient({});
const repository = new DynamoRouteRepository(dynamo, process.env.ROUTES_TABLE!);
const sm = new SecretsManagerClient({});

/** GET GOOGLE KEY from ENV or Secrets Manager */
async function getGoogleKey(): Promise<string> {
  console.info("[getGoogleKey] start");
  if (process.env.GOOGLE_API_KEY) {
    console.info("[getGoogleKey] using ENV key");
    return process.env.GOOGLE_API_KEY;
  }
  console.info("[getGoogleKey] fetching from Secrets Manager");
  const resp = await sm.send(new GetSecretValueCommand({ SecretId: "google-api-key" }));
  console.info("[getGoogleKey] retrieved key");
  return JSON.parse(resp.SecretString!).GOOGLE_API_KEY;
}

/** HTTP GET + JSON helper */
function fetchJson<T = any>(url: string): Promise<T> {
  console.info(`[fetchJson] GET ${url}`);
  return new Promise((resolve, reject) => {
    const req = httpsRequest(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        console.info(`[fetchJson] response body: ${data}`);
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch (err) {
          console.error("[fetchJson] JSON.parse error:", data);
          reject(err);
        }
      });
    });
    req.on("error", (err) => {
      console.error("[fetchJson] HTTP error:", err);
      reject(err);
    });
    req.end();
  });
}

/** Geocode an address or parse “lat,lng” */
async function geocode(
  address: string,
  apiKey: string
): Promise<{ lat: number; lng: number }> {
  console.info("[geocode] start for", address);
  const coordRx = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/;
  if (coordRx.test(address)) {
    const [lat, lng] = address.split(/\s*,\s*/).map(Number);
    console.info("[geocode] parsed coords:", lat, lng);
    return { lat, lng };
  }
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${apiKey}`;
  const res: any = await fetchJson(url);
  const loc = res?.results?.[0]?.geometry?.location;
  if (!loc) {
    console.warn("[geocode] no result for", address, res);
    throw new Error(`Geocoding failed for "${address}"`);
  }
  console.info("[geocode] geocoded to:", loc.lat, loc.lng);
  return { lat: loc.lat, lng: loc.lng };
}

/** POST JSON helper for legacy Routes API */
function postJson<T>(
  host: string,
  path: string,
  apiKey: string,
  body: any
): Promise<T> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const opts: RequestOptions = {
      method: "POST",
      host,
      path,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "routes.legs.duration,routes.legs.distanceMeters,routes.legs.polyline.encodedPolyline",
      },
    };
    console.info(`[postJson] POST https://${host}${path}`, body);
    const req = httpsRequest(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        console.info(`[postJson] HTTP ${res.statusCode}:`, data);
        if (res.statusCode !== 200) {
          console.error(`[postJson] non-200 status: ${res.statusCode}`);
          return reject(new Error(`Routes API returned HTTP ${res.statusCode}`));
        }
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch (err) {
          console.error("[postJson] JSON.parse error:", data);
          reject(err);
        }
      });
    });
    req.on("error", (err) => {
      console.error("[postJson] HTTP error:", err);
      reject(err);
    });
    req.write(payload);
    req.end();
  });
}

/** Compute up to N alternative walking routes */
async function computeRoutes(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  apiKey: string
): Promise<
  Array<{ distanceMeters: number; durationSeconds: number; encoded: string }>
> {
  console.info("[computeRoutes] origin → destination:", origin, destination);
  const body = {
    origin: {
      location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
    },
    destination: {
      location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
    },
    travelMode: "WALKING",
    computeAlternativeRoutes: true,
    routeModifiers: { avoidHighways: true, avoidTolls: true, avoidFerries: true },
  };
  const resp: any = await postJson(
    "routes.googleapis.com",
    "/directions/v2:computeRoutes",
    apiKey,
    body
  );
  return (resp.routes || [])
    .map((r: any) => {
      const leg = r.legs?.[0];
      if (!leg?.polyline?.encodedPolyline) return null;
      const dur =
        typeof leg.duration === "string"
          ? parseInt(leg.duration.replace(/\D/g, ""), 10)
          : leg.duration?.seconds ?? 0;
      return {
        distanceMeters: leg.distanceMeters!,
        durationSeconds: dur,
        encoded: leg.polyline.encodedPolyline,
      };
    })
    .filter((x: any): x is any => !!x);
}

/** Offset & snapping helpers (for distance‑only mode) omitted for brevity… */

/** MAIN HANDLER */
export const handler: SQSHandler = async (event) => {
  console.info("[handler] received event:", JSON.stringify(event, null, 2));
  const googleKey = await getGoogleKey();

  for (const record of event.Records) {
    console.info("[handler] processing record:", record.body);
    const {
      jobId,
      origin,
      destination,
      distanceKm,
      roundTrip = false,
      circle = false,
      maxDeltaKm = 1,
      routesCount = 3,
    } = JSON.parse(record.body);

    // 1) Geocode ends
    const oCoords = await geocode(origin, googleKey);
    const dCoords = destination ? await geocode(destination, googleKey) : undefined;

    const saved: Route[] = [];
    let attempts = 0;
    const maxAt = routesCount * 5;
    console.info(`[handler] will try up to ${maxAt} attempts`);

    while (saved.length < routesCount && attempts++ < maxAt) {
      console.info(`[handler] attempt ${attempts}, have ${saved.length}/${routesCount}`);
      if (dCoords) {
        // point→point
        const alts = await computeRoutes(oCoords, dCoords, googleKey);
        for (const alt of alts) {
          if (saved.length >= routesCount) break;
          const km = alt.distanceMeters / 1000;
          if (Math.abs(km - (distanceKm ?? km)) > maxDeltaKm) {
            console.warn("[handler] alt out of range, skip", km);
            continue;
          }
          const route = new Route({
            routeId: UUID.generate(),
            jobId:   UUID.fromString(jobId),
            distanceKm:new DistanceKm(km),
            duration:  new Duration(alt.durationSeconds),
            path:      new Path(alt.encoded),
          });
          await repository.save(route);
          console.info("[handler] saved route:", route);
          saved.push(route);
        }
      } else {
        // distance‑only loop (similar pattern)
        // … use your offsetCoordinate + computeRoutes to build `leg`
      }
    }

    if (saved.length) {
      console.info(`[handler] publishing ${saved.length} routes`);
      await publishRoutesGenerated(jobId, saved);
    } else {
      console.warn(`[handler] no routes after ${maxAt} attempts`);
    }
  }
};

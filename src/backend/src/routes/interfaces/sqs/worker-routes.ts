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
  console.log("[getGoogleKey] start");
  if (process.env.GOOGLE_API_KEY) {
    console.log("[getGoogleKey] using ENV key");
    return process.env.GOOGLE_API_KEY;
  }
  console.log("[getGoogleKey] fetching from SecretsManager");
  const resp = await sm.send(new GetSecretValueCommand({ SecretId: "google-api-key" }));
  const key = JSON.parse(resp.SecretString!).GOOGLE_API_KEY;
  console.log("[getGoogleKey] retrieved key");
  return key;
}

/** HTTP GET + JSON helper */
function fetchJson<T = any>(url: string): Promise<T> {
  console.log("[fetchJson] GET", url);
  return new Promise((resolve, reject) => {
    const req = httpsRequest(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        console.log("[fetchJson] response body:", data);
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch (err) {
          console.error("[fetchJson] JSON.parse error:", data);
          reject(err);
        }
      });
    });
    req.on("error", (err) => {
      console.error("[fetchJson] HTTPS error:", err);
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
  console.log("[geocode] start for", address);
  const coordRx = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/;
  if (coordRx.test(address)) {
    const [lat, lng] = address.split(/\s*,\s*/).map(Number);
    console.log("[geocode] parsed coords:", lat, lng);
    return { lat, lng };
  }
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${apiKey}`;
  console.log("[geocode] calling API:", url);
  const res: any = await fetchJson(url);
  const loc = res?.results?.[0]?.geometry?.location;
  if (!loc) {
    console.error("[geocode] failed, no location in response:", res);
    throw new Error(`Geocoding failed for "${address}"`);
  }
  console.log("[geocode] got location:", loc.lat, loc.lng);
  return { lat: loc.lat, lng: loc.lng };
}

/** POST JSON helper for Routes Preferred API */
function postJson<T>(host: string, path: string, apiKey: string, body: any): Promise<T> {
  console.log("[postJson] POST to", host + path, "body:", body);
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
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
      },
    };
    const req = httpsRequest(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        console.log(`[postJson] response ${res.statusCode}:`, data);
        if (res.statusCode !== 200) {
          console.error("[postJson] non-200 status");
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
      console.error("[postJson] HTTPS error:", err);
      reject(err);
    });
    req.write(payload);
    req.end();
  });
}

/** Compute up to N walking alternatives */
async function computeRoutes(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  apiKey: string
): Promise<Array<{ distanceMeters: number; durationSeconds: number; encoded: string }>> {
  console.log("[computeRoutes] origin", origin, "→ destination", destination);
  const body = {
    origin:      { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
    destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
    travelMode:  "WALK",
    polylineQuality:   "OVERVIEW",
    routingPreference: "TRAFFIC_UNAWARE",
    computeAlternativeRoutes: true,
    routeModifiers: { avoidHighways: true, avoidTolls: true, avoidFerries: true },
  };
  const resp: any = await postJson(
    "routespreferred.googleapis.com",
    "/v1:computeRoutes",
    apiKey,
    body
  );
  console.log("[computeRoutes] raw response:", resp);
  return (resp.routes || [])
    .map((r: any) => {
      const leg = r.legs?.[0];
      if (!leg?.polyline?.encodedPolyline) {
        console.warn("[computeRoutes] missing polyline on leg:", leg);
        return null;
      }
      const seconds =
        typeof leg.duration === "object"
          ? leg.duration.seconds
          : parseInt(leg.duration.replace(/\D/g, ""), 10);
      console.log("[computeRoutes] mapped leg:", {
        distanceMeters: leg.distanceMeters,
        durationSeconds: seconds,
      });
      return {
        distanceMeters: leg.distanceMeters,
        durationSeconds: seconds,
        encoded: leg.polyline.encodedPolyline,
      };
    })
    .filter((x: any): x is { distanceMeters: number; durationSeconds: number; encoded: string } => !!x);
}

/** Offset a point by bearing & distance (km) */
function offsetCoordinate(
  lat: number,
  lng: number,
  distanceKm: number,
  bearingDeg = 90
): { lat: number; lng: number } {
  console.log("[offsetCoordinate] in:", { lat, lng, distanceKm, bearingDeg });
  const R = 6371;
  const d = distanceKm / R;
  const θ = (bearingDeg * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lng * Math.PI) / 180;
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(d) +
      Math.cos(φ1) * Math.sin(d) * Math.cos(θ)
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(d) * Math.cos(φ1),
      Math.cos(d) - Math.sin(φ1) * Math.sin(φ2)
    );
  const out = { lat: (φ2 * 180) / Math.PI, lng: (λ2 * 180) / Math.PI };
  console.log("[offsetCoordinate] out:", out);
  return out;
}

/** Snap point to nearest road */
async function snapToRoad(point: { lat: number; lng: number }, apiKey: string) {
  console.log("[snapToRoad] in:", point);
  const url = `https://roads.googleapis.com/v1/nearestRoads?points=${point.lat},${point.lng}&key=${apiKey}`;
  try {
    const data: any = await fetchJson(url);
    const loc = data?.snappedPoints?.[0]?.location;
    console.log("[snapToRoad] snapped:", loc);
    return loc
      ? { lat: loc.latitude ?? loc.lat, lng: loc.longitude ?? loc.lng }
      : point;
  } catch (err) {
    console.warn("[snapToRoad] failed:", err);
    return point;
  }
}

/** Compute a circular 8‑segment loop */
async function computeCircularRoute(
  origin: { lat: number; lng: number },
  distanceKm: number,
  segments: number,
  apiKey: string
) {
  console.log("[computeCircularRoute] start:", origin, distanceKm, segments);
  const radius = distanceKm / (2 * Math.PI);
  const pts: Array<{ lat: number; lng: number }> = [];
  for (let i = 0; i < segments; i++) {
    const raw = offsetCoordinate(origin.lat, origin.lng, radius, (360 / segments) * i);
    pts.push(await snapToRoad(raw, apiKey));
  }
  let totalDist = 0,
    totalDur = 0,
    encoded: string | undefined;
  for (let i = 0; i < segments; i++) {
    const a = pts[i],
      b = pts[(i + 1) % segments];
    console.log("[computeCircularRoute] segment", i, a, "→", b);
    const legs = await computeRoutes(a, b, apiKey);
    const leg = legs[0];
    if (!leg) {
      console.warn("[computeCircularRoute] no leg, abort");
      return null;
    }
    totalDist += leg.distanceMeters;
    totalDur += leg.durationSeconds;
    if (encoded) {
      const c1 = new Path(encoded).Coordinates;
      const c2 = new Path(leg.encoded).Coordinates.slice(1);
      encoded = Path.fromCoordinates([...c1, ...c2]).Encoded;
    } else {
      encoded = leg.encoded;
    }
  }
  console.log("[computeCircularRoute] result:", { totalDist, totalDur });
  return encoded ? { distanceMeters: totalDist, durationSeconds: totalDur, encoded } : null;
}

/** Save a single route entity + log */
async function persistRoute(
  jobId: string,
  km: number,
  durSec: number,
  poly: string
) {
  console.log("[persistRoute] saving route", { jobId, km, durSec });
  const route = new Route({
    routeId: UUID.generate(),
    jobId:   UUID.fromString(jobId),
    distanceKm: new DistanceKm(km),
    duration:   new Duration(durSec),
    path:       new Path(poly),
  });
  await repository.save(route);
  console.log("[persistRoute] saved:", route);
  return route;
}

/** MAIN HANDLER */
export const handler: SQSHandler = async (event) => {
  console.log("[handler] Received event:", JSON.stringify(event, null, 2));
  const googleKey = await getGoogleKey();

  for (const { body } of event.Records) {
    console.log("[handler] record body:", body);
    const {
      jobId,
      origin,
      destination,
      distanceKm,
      roundTrip = false,
      circle    = false,
      maxDeltaKm = 1,
      routesCount = 3,
    } = JSON.parse(body);
    console.log("[handler] params:", { jobId, origin, destination, distanceKm, roundTrip, circle, maxDeltaKm, routesCount });

    // 1) Geocode
    const oCoords = await geocode(origin, googleKey);
    const dCoords = destination ? await geocode(destination, googleKey) : undefined;

    // 2) Attempt loop
    const savedRoutes: Route[] = [];
    let attempts = 0;
    const maxAttempts = routesCount * 10;
    console.log("[handler] loop start maxAttempts=", maxAttempts);

    while (savedRoutes.length < routesCount && attempts++ < maxAttempts) {
      console.log(`[handler] attempt ${attempts}, have ${savedRoutes.length}/${routesCount}`);
      if (dCoords) {
        // point‑to‑point
        const alts = await computeRoutes(oCoords, dCoords, googleKey);
        console.log("[handler] got alternatives:", alts.length);
        for (const alt of alts) {
          if (savedRoutes.length >= routesCount) break;
          const km = alt.distanceMeters / 1000;
          console.log("[handler] evaluating alt km=", km);
          if (Math.abs(km - (distanceKm ?? km)) > maxDeltaKm) {
            console.warn("[handler] alt out of range, skipping");
            continue;
          }
          savedRoutes.push(await persistRoute(jobId, km, alt.durationSeconds, alt.encoded));
        }
      } else {
        // distance‑only
        console.log("[handler] distance‑only mode");
        let leg: { distanceMeters: number; durationSeconds: number; encoded: string } | null = null;
        if (roundTrip && circle) {
          console.log("[handler] circular round trip");
          leg = await computeCircularRoute(oCoords, distanceKm!, 8, googleKey);
        } else {
          const bearing = Math.random() * 360;
          console.log("[handler] random bearing:", bearing);
          const halfDist = roundTrip ? distanceKm! / 2 : distanceKm!;
          const rawDest = offsetCoordinate(oCoords.lat, oCoords.lng, halfDist, bearing);
          const snapped = await snapToRoad(rawDest, googleKey);
          console.log("[handler] snapped dest:", snapped);
          const [outLeg] = await computeRoutes(oCoords, snapped, googleKey);
          if (!outLeg?.encoded) {
            console.warn("[handler] outLeg missing, continue");
            continue;
          }
          if (!roundTrip) {
            leg = outLeg;
          } else {
            console.log("[handler] computing backLeg");
            const [backLeg] = await computeRoutes(snapped, oCoords, googleKey);
            if (!backLeg?.encoded) {
              console.warn("[handler] backLeg missing, continue");
              continue;
            }
            const c1 = new Path(outLeg.encoded).Coordinates;
            const c2 = new Path(backLeg.encoded).Coordinates.slice(1);
            const stitched = Path.fromCoordinates([...c1, ...c2]).Encoded;
            leg = {
              distanceMeters: outLeg.distanceMeters + backLeg.distanceMeters,
              durationSeconds: outLeg.durationSeconds + backLeg.durationSeconds,
              encoded: stitched,
            };
          }
        }
        if (leg) {
          const km = leg.distanceMeters / 1000;
          console.log("[handler] evaluated leg km=", km);
          if (Math.abs(km - distanceKm!) > maxDeltaKm) {
            console.warn("[handler] leg out of range, skipping");
            continue;
          }
          savedRoutes.push(await persistRoute(jobId, km, leg.durationSeconds, leg.encoded));
        }
      }
    }

    // 3) Publish
    if (savedRoutes.length) {
      console.log("[handler] publishing", savedRoutes.length, "routes");
      await publishRoutesGenerated(jobId, savedRoutes);
      console.log(`[handler] published routes for job ${jobId}`);
    } else {
      console.warn(`[handler] no routes after ${maxAttempts} attempts`);
    }
  }
};

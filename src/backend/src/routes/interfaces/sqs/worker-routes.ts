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

// Fetch a URL and parse JSON
function fetchJson<T = any>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        if (!data) return resolve(null as any);
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          console.error("❌ JSON.parse error:", data);
          reject(err);
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

// Turn an address into lat/lng
async function geocode(
  address: string,
  apiKey: string
): Promise<{ lat: number; lng: number }> {
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json` +
    `?address=${encodeURIComponent(address)}` +
    `&key=${apiKey}`;
  console.info("🌐 Geocoding address:", address);
  const res: any = await fetchJson(url);
  const loc = res?.results?.[0]?.geometry?.location;
  if (!loc) {
    console.warn("⚠️ No geocoding result for", address, res);
    throw new Error(`Geocoding failed for "${address}"`);
  }
  return { lat: loc.lat, lng: loc.lng };
}

// POST JSON to Google Routes API
function postJson<T = any>(
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
    const req = httpsRequest(opts, (res) => {
      console.info(`📡 Routes API → ${res.statusCode} ${res.statusMessage}`);
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        if (!data) {
          console.warn("⚠️ Empty Routes API response");
          return resolve(null as any);
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          console.error("❌ JSON.parse error:", data);
          reject(err);
        }
      });
    });
    req.on("error", (err) => {
      console.error("❌ HTTPS error:", err);
      reject(err);
    });
    req.write(payload);
    req.end();
  });
}

// Compute up to N alternative walking routes between two points
async function computeRoutes(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  apiKey: string
): Promise<
  Array<{
    distanceMeters: number;
    durationSeconds: number;
    encoded?: string;
  }>
> {
  const body = {
    origin: {
      location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
    },
    destination: {
      location: {
        latLng: { latitude: destination.lat, longitude: destination.lng },
      },
    },
    travelMode: "WALK",
    computeAlternativeRoutes: true,
    routingPreference: "UNRESTRICTED",
  };
  console.info("🌐 Calling Routes API with coords…", body);
  let resp: any;
  try {
    resp = await postJson(
      "routes.googleapis.com",
      "/directions/v2:computeRoutes",
      apiKey,
      body
    );
  } catch (err) {
    console.error("❌ Failed calling Routes API:", err);
    return [];
  }

  console.info("📊 Routes API returned:", JSON.stringify(resp, null, 2));
  return (resp?.routes ?? [])
    .map((r: any) => {
      const leg = r.legs?.[0];
      if (!leg) return null;
      const dur =
        typeof leg.duration === "string"
          ? parseInt(leg.duration.replace(/[^0-9]/g, ""), 10)
          : leg.duration?.seconds ?? 0;
      return {
        distanceMeters: leg.distanceMeters || 0,
        durationSeconds: dur,
        ...(leg.polyline?.encodedPolyline
          ? { encoded: leg.polyline.encodedPolyline }
          : {}),
      };
    })
    .filter(
      (
        x
      ): x is {
        distanceMeters: number;
        durationSeconds: number;
        encoded?: string;
      } => x !== null
    );
}

// Offset a coordinate by a given bearing and distance
function offsetCoordinate(
  lat: number,
  lng: number,
  distanceKm: number,
  bearingDeg = 90
): { lat: number; lng: number } {
  const R = 6371,
    d = distanceKm / R,
    θ = (bearingDeg * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180,
    λ1 = (lng * Math.PI) / 180;
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(d) + Math.cos(φ1) * Math.sin(d) * Math.cos(θ)
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(d) * Math.cos(φ1),
      Math.cos(d) - Math.sin(φ1) * Math.sin(φ2)
    );
  return { lat: (φ2 * 180) / Math.PI, lng: (λ2 * 180) / Math.PI };
}

// Retrieve Google API key (env or Secrets Manager)
async function getGoogleKey(): Promise<string> {
  const envKey = process.env.GOOGLE_API_KEY;
  if (envKey) {
    console.info("🔑 Google API Key from ENV");
    return envKey;
  }
  const resp = await sm.send(
    new GetSecretValueCommand({ SecretId: "google-api-key" })
  );
  const json = JSON.parse(resp.SecretString!);
  const key = json.GOOGLE_API_KEY as string;
  console.info("🔑 Google API Key retrieved");
  return key;
}

export const handler: SQSHandler = async (event) => {
  console.info("📥 Received SQS event:", JSON.stringify(event, null, 2));
  const googleKey = await getGoogleKey();

  for (const record of event.Records) {
    const {
      origin,
      destination,
      distanceKm,
      roundTrip = false,
      maxDeltaKm = 0.5,
      routesCount = 3,
      jobId,
    } = JSON.parse(record.body);

    const routes: Route[] = [];

    // If destination is provided, use computeRoutes + retry logic
    if (destination) {
      const [oCoords, dCoords] = await Promise.all([
        geocode(origin, googleKey),
        geocode(destination, googleKey),
      ]);

      let attempts = 0;
      const maxAttempts = 10;

      while (routes.length < routesCount && attempts++ < maxAttempts) {
        const alts = await computeRoutes(oCoords, dCoords, googleKey);
        if (alts.length === 0) break;

        for (const alt of alts) {
          if (routes.length >= routesCount) break;

          const km = alt.distanceMeters / 1000;
          if (
            typeof distanceKm === "number" &&
            Math.abs(km - distanceKm) > maxDeltaKm
          ) {
            console.warn(
              `⚠️ Generated ${km.toFixed(
                2
              )}km differs from requested ${distanceKm}km by more than ${maxDeltaKm}km`
            );
            continue;
          }

          const route = new Route({
            routeId: UUID.generate(),
            jobId: UUID.fromString(jobId),
            distanceKm: new DistanceKm(km),
            duration: new Duration(alt.durationSeconds),
            ...(alt.encoded ? { path: new Path(alt.encoded) } : {}),
          });

          console.info("💾 Saving route to DynamoDB:", route);
          try {
            await repository.save(route);
            routes.push(route);
          } catch (err) {
            console.error("❌ Error saving to DynamoDB:", err);
          }
        }
      }

      if (routes.length) {
        try {
          await publishRoutesGenerated(jobId, routes);
        } catch (err) {
          console.error("❌ Error publishing routes:", err);
        }
      }
      continue;
    }

    // Otherwise, generate random bearings (round-trip or one-way)
    const oCoords = await geocode(origin, googleKey);
    let attempts = 0;
    while (routes.length < routesCount && attempts++ < routesCount * 5) {
      const bearing = Math.random() * 360;
      const dist = roundTrip ? distanceKm! / 2 : distanceKm!;
      const dest = offsetCoordinate(oCoords.lat, oCoords.lng, dist, bearing);

      const [outLeg] = await computeRoutes(oCoords, dest, googleKey);
      if (!outLeg) continue;

      let totalDistance = outLeg.distanceMeters;
      let totalDuration = outLeg.durationSeconds;
      let encoded = outLeg.encoded;

      if (roundTrip) {
        const [backLeg] = await computeRoutes(dest, oCoords, googleKey);
        if (!backLeg) continue;
        totalDistance += backLeg.distanceMeters;
        totalDuration += backLeg.durationSeconds;
        if (encoded && backLeg.encoded) {
          const c1 = new Path(encoded).Coordinates;
          const c2 = new Path(backLeg.encoded).Coordinates.slice().reverse();
          encoded = Path.fromCoordinates([...c1, ...c2.slice(1)]).Encoded;
        } else {
          encoded = undefined;
        }
      }

      const km = totalDistance / 1000;
      if (
        typeof distanceKm === "number" &&
        Math.abs(km - distanceKm!) > maxDeltaKm
      ) {
        console.warn(
          `⚠️ Generated ${km.toFixed(
            2
          )}km differs from requested ${distanceKm}km by more than ${maxDeltaKm}km`
        );
        continue;
      }

      const route = new Route({
        routeId: UUID.generate(),
        jobId: UUID.fromString(jobId),
        distanceKm: new DistanceKm(km),
        duration: new Duration(totalDuration),
        ...(encoded ? { path: new Path(encoded) } : {}),
      });

      console.info("💾 Saving route to DynamoDB:", route);
      try {
        await repository.save(route);
        routes.push(route);
      } catch (err) {
        console.error("❌ Error saving to DynamoDB:", err);
      }
    }

    if (routes.length) {
      try {
        await publishRoutesGenerated(jobId, routes);
      } catch (err) {
        console.error("❌ Error publishing routes:", err);
      }
    }
  }
};

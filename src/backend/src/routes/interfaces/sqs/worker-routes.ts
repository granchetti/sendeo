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

async function getGoogleKey(): Promise<string> {
  const envKey = process.env.GOOGLE_API_KEY;
  if (envKey) {
    console.info("🔑 Google API Key from ENV variable");
    return envKey;
  }
  const resp = await sm.send(
    new GetSecretValueCommand({ SecretId: "google-api-key" })
  );
  const json = JSON.parse(resp.SecretString!);
  const key = json.GOOGLE_API_KEY as string;
  console.info(
    "🔑 Google API Key retrieved (truncated):",
    key.slice(0, 8) + "…"
  );
  return key;
}

function fetchJson<T = any>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (!data) return resolve(null as any);
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          console.error("❌ JSON.parse error in fetchJson:", data);
          reject(err);
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

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
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (!data) {
          console.warn("⚠️ Empty response body from Routes API");
          return resolve(null as any);
        }
        try {
          return resolve(JSON.parse(data));
        } catch (err) {
          console.error("❌ JSON.parse error, raw body:", data);
          return reject(err);
        }
      });
    });

    req.on("error", (err) => {
      console.error("❌ HTTPS request error:", err);
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

function offsetCoordinate(
  lat: number,
  lng: number,
  distanceKm: number,
  bearingDeg = 90
): { lat: number; lng: number } {
  const R = 6371; // Earth radius in km
  const dRad = distanceKm / R;
  const bearing = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dRad) +
      Math.cos(lat1) * Math.sin(dRad) * Math.cos(bearing)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(dRad) * Math.cos(lat1),
      Math.cos(dRad) - Math.sin(lat1) * Math.sin(lat2)
    );
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

async function computeRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  apiKey: string
): Promise<{
  distanceMeters: number;
  durationSeconds: number;
  encoded?: string;
} | null> {
  const requestBody = {
    origin: {
      location: {
        latLng: { latitude: origin.lat, longitude: origin.lng },
      },
    },
    destination: {
      location: {
        latLng: { latitude: destination.lat, longitude: destination.lng },
      },
    },
    travelMode: "WALK",
  };
  console.info("🌐 Calling Routes API with coords…", requestBody);
  let resp: any;
  try {
    resp = await postJson(
      "routes.googleapis.com",
      "/directions/v2:computeRoutes",
      apiKey,
      requestBody
    );
  } catch (err) {
    console.error("❌ Failed calling Routes API:", err);
    return null;
  }
  console.info("📊 Routes API returned:", JSON.stringify(resp, null, 2));
  const leg = resp?.routes?.[0]?.legs?.[0];
  if (!leg) {
    console.warn("⚠️ No legs returned in response:", resp);
    return null;
  }
  const durationSeconds =
    typeof leg.duration === "string"
      ? parseInt(leg.duration.replace(/[^0-9]/g, ""), 10)
      : leg.duration?.seconds ?? 0;
  const encoded = leg.polyline?.encodedPolyline;
  return {
    distanceMeters: leg.distanceMeters || 0,
    durationSeconds,
    ...(encoded ? { encoded } : {}),
  };
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

    if (destination) {
      const [oCoords, dCoords] = await Promise.all([
        geocode(origin, googleKey),
        geocode(destination, googleKey),
      ]);

      let attempts = 0;
      while (routes.length < routesCount && attempts < routesCount) {
        attempts++;
        const leg = await computeRoute(oCoords, dCoords, googleKey);
        if (!leg) {
          break;
        }

        if (
          typeof distanceKm === "number" &&
          typeof maxDeltaKm === "number" &&
          Math.abs(leg.distanceMeters / 1000 - distanceKm) > maxDeltaKm
        ) {
          console.warn(
            `Warning: generated ${
              leg.distanceMeters / 1000
            }km differs from requested ${distanceKm}km by more than ${maxDeltaKm}km`
          );
          continue;
        }

        const route = new Route({
          routeId: UUID.generate(),
          jobId: UUID.fromString(jobId),
          distanceKm: new DistanceKm(leg.distanceMeters / 1000),
          duration: new Duration(leg.durationSeconds),
          ...(leg.encoded ? { path: new Path(leg.encoded) } : {}),
        });

        console.info("💾 Saving route to DynamoDB:", route);
        try {
          await repository.save(route);
          console.info("✅ Route saved:", route.routeId.toString());
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
      continue;
    }

    const oCoords = await geocode(origin, googleKey);
    let attempts = 0;

    while (routes.length < routesCount && attempts++ < routesCount * 5) {
      const bearing = Math.random() * 360;
      const dist = roundTrip ? distanceKm! / 2 : distanceKm!;
      const destCoords = offsetCoordinate(
        oCoords.lat,
        oCoords.lng,
        dist,
        bearing
      );

      const outLeg = await computeRoute(oCoords, destCoords, googleKey);
      if (!outLeg) continue;

      let totalDistance = outLeg.distanceMeters;
      let totalDuration = outLeg.durationSeconds;
      let encoded = outLeg.encoded;

      if (roundTrip) {
        const backLeg = await computeRoute(destCoords, oCoords, googleKey);
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

      if (
        typeof maxDeltaKm === "number" &&
        Math.abs(totalDistance / 1000 - distanceKm!) > maxDeltaKm
      ) {
        console.warn(
          `Warning: generated ${
            totalDistance / 1000
          }km differs from requested ${distanceKm}km by more than ${maxDeltaKm}km`
        );
        continue;
      }

      const route = new Route({
        routeId: UUID.generate(),
        jobId: UUID.fromString(jobId),
        distanceKm: new DistanceKm(totalDistance / 1000),
        duration: new Duration(totalDuration),
        ...(encoded ? { path: new Path(encoded) } : {}),
      });

      console.info("💾 Saving route to DynamoDB:", route);
      try {
        await repository.save(route);
        console.info("✅ Route saved:", route.routeId.toString());
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

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

/**
 * Geocode an address or parse provided coordinates.
 *
 * The function accepts plain address strings as well as "lat,lng" coordinate
 * pairs. When the input matches a coordinate pattern it is returned directly
 * without calling the Google Geocode API.
 */
export async function geocode(
  address: string,
  apiKey: string
): Promise<{ lat: number; lng: number }> {
  const coordRegex = /^-?\d+(?:\.\d+)?,\s*-?\d+(?:\.\d+)?$/;
  if (coordRegex.test(address)) {
    const [latStr, lngStr] = address.split(/\s*,\s*/);
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    return { lat, lng };
  }

  const url =
    `https://maps.googleapis.com/maps/api/geocode/json` +
    `?address=${encodeURIComponent(address)}` +
    `&key=${apiKey}`;
  console.info("🌐 Geocoding address:", address);
  const res: any = await fetchJson(url);
  const loc = res?.results?.[0]?.geometry?.location;
  if (!loc) {
    console.warn("⚠️ No geocoding result for", address, res);
    throw new Error(`Geocoding failed for \"${address}\"`);
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
      let data = "";
      console.info(`📡 Routes API HTTP ${res.statusCode} ${res.statusMessage}`);
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        console.info("📊 Routes API raw body:", data);
        if (res.statusCode !== 200) {
          return reject(
            new Error(`Routes API returned HTTP ${res.statusCode}`)
          );
        }
        if (!data) {
          // aquí veamos si Google nos manda un JSON con "error" en lugar de rutas
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
    travelMode: "WALKING",
    computeAlternativeRoutes: true,
    routeModifiers: {
      avoidHighways: true,
      avoidTolls: true,
      avoidFerries: true,
    },
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
        x: {
          distanceMeters: number;
          durationSeconds: number;
          encoded?: string;
        } | null
      ): x is {
        distanceMeters: number;
        durationSeconds: number;
        encoded?: string;
      } => x !== null
    );
}

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

// Snap a coordinate to the nearest road so routes always follow walkable paths
async function snapToRoad(
  point: { lat: number; lng: number },
  apiKey: string
): Promise<{ lat: number; lng: number }> {
  const url =
    `https://roads.googleapis.com/v1/nearestRoads?points=${point.lat},${point.lng}` +
    `&key=${apiKey}`;
  try {
    const data: any = await fetchJson(url);
    const loc = data?.snappedPoints?.[0]?.location;
    if (loc) {
      return { lat: loc.latitude ?? loc.lat, lng: loc.longitude ?? loc.lng };
    }
  } catch (err) {
    console.warn("⚠️ Failed snapping to road:", err);
  }
  return point;
}

// PATCH 👇: Descarta circular route si falta cualquier encodedPolyline
async function computeCircularRoute(
  origin: { lat: number; lng: number },
  distanceKm: number,
  segments: number,
  apiKey: string
): Promise<{
  distanceMeters: number;
  durationSeconds: number;
  encoded?: string;
} | null> {
  const radius = distanceKm / (2 * Math.PI);
  const points: { lat: number; lng: number }[] = [];
  for (let i = 0; i < segments; i++) {
    const raw = offsetCoordinate(
      origin.lat,
      origin.lng,
      radius,
      (360 / segments) * i
    );
    points.push(await snapToRoad(raw, apiKey));
  }

  let totalDistance = 0;
  let totalDuration = 0;
  let encoded: string | undefined;

  for (let i = 0; i < segments; i++) {
    const start = points[i];
    const end = points[(i + 1) % segments];
    const [leg] = await computeRoutes(start, end, apiKey);
    if (!leg || !leg.encoded) {
      // PATCH 👈 descartar si falta cualquier tramo
      console.warn("⚠️ Discarded circular route: missing encodedPolyline on segment");
      return null;
    }
    totalDistance += leg.distanceMeters;
    totalDuration += leg.durationSeconds;
    if (encoded) {
      const c1 = new Path(encoded).Coordinates;
      const c2 = new Path(leg.encoded).Coordinates.slice();
      encoded = Path.fromCoordinates([...c1, ...c2.slice(1)]).Encoded;
    } else {
      encoded = leg.encoded;
    }
  }

  return {
    distanceMeters: totalDistance,
    durationSeconds: totalDuration,
    ...(encoded ? { encoded } : {}),
  };
}

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
  const googleKey = await getGoogleKey();
  for (const record of event.Records) {
    const { jobId, origin, destination, maxDeltaKm = 1, routesCount = 3 } = JSON.parse(record.body);

    const oCoords = await geocode(origin, googleKey);
    const dCoords = await geocode(destination, googleKey);

    const savedRoutes: Route[] = [];
    let attempts = 0;
    const maxAttempts = routesCount * 5;

    while (savedRoutes.length < routesCount && attempts++ < maxAttempts) {
      let alts: Array<{ distanceMeters: number; durationSeconds: number; encoded?: string }> = [];
      try {
        alts = await computeRoutes(oCoords, dCoords, googleKey);
      } catch (err) {
        console.error("❌ computeRoutes error:", err);
        break; // si la API nos niega el servicio, no sigas intentando
      }

      if (!alts.length) {
        console.warn(`⚠️ No alternatives returned (attempt ${attempts})`);
        continue;
      }

      for (const alt of alts) {
        if (savedRoutes.length >= routesCount) break;
        const km = alt.distanceMeters / 1000;
        if (Math.abs(km - km /* aquí deberías comparar con distanceKm si aplica */) > maxDeltaKm) {
          console.warn("⚠️ Alt distance out of range, skipping");
          continue;
        }
        const route = new Route({
          routeId: UUID.generate(),
          jobId: UUID.fromString(jobId),
          distanceKm: new DistanceKm(km),
          duration: new Duration(alt.durationSeconds),
          path: new Path(alt.encoded!),
        });
        await repository.save(route);
        savedRoutes.push(route);
      }
    }

    if (savedRoutes.length) {
      await publishRoutesGenerated(jobId, savedRoutes);
    } else {
      console.warn("⚠️ No routes could be generated after max attempts");
      // Opcional: publica un mensaje de error o un job con estado "failed"
      // await publishRoutesGenerated(jobId, []);
    }
  }
};


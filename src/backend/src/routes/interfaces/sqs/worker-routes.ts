import { SQSHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { request as httpsRequest, RequestOptions } from "node:https";
import { createHash } from "node:crypto";
import { Path } from "../../domain/value-objects/path";
import type { Route } from "../../domain/entities/route";
import { DynamoRouteRepository } from "../../infrastructure/dynamodb/dynamo-route-repository";
import { publishRoutesGenerated, publishErrorOccurred } from "../appsync-client";
import { fetchJson, getGoogleKey } from "../shared/utils";
import { RouteGenerator } from "../../domain/services/route-generator";

const dynamo = new DynamoDBClient({
  endpoint: process.env.AWS_ENDPOINT_URL_DYNAMODB,
});
const sqs = new SQSClient({});
const repository = new DynamoRouteRepository(dynamo, process.env.ROUTES_TABLE!);
const generator = new RouteGenerator(repository);
const SNAP_THRESHOLD_KM = 0.5;


async function postJson<T>(
  host: string,
  path: string,
  apiKey: string,
  body: any,
  attempt = 0
): Promise<T | null> {
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
        "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
    },
  };
  console.info(`[postJson] POST https://${host}${path}`, body);
  try {
    const data = await new Promise<string>((resolve, reject) => {
      const req = httpsRequest(opts, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          console.info(`[postJson] HTTP ${res.statusCode}`, data);
          if (res.statusCode !== 200) {
            const err: any = new Error(
              `Routes API returned HTTP ${res.statusCode}`
            );
            err.statusCode = res.statusCode;
            err.body = data;
            return reject(err);
          }
          resolve(data);
        });
      });
      req.on("error", (err) => reject(err));
      req.write(payload);
      req.end();
    });
    return data ? JSON.parse(data) : null;
  } catch (err: any) {
    const status = err?.statusCode;
    if ((status === 429 || (status >= 500 && status < 600)) && attempt < 2) {
      const delay = 500 * Math.pow(2, attempt);
      console.warn(
        `[postJson] retry ${attempt + 1} in ${delay}ms due to ${status}`
      );
      await new Promise((r) => setTimeout(r, delay));
      return postJson<T>(host, path, apiKey, body, attempt + 1);
    }
    console.error("[postJson] HTTP error", err);
    throw err;
  }
}

async function computeRoutes(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  apiKey: string
) {
  console.info("[computeRoutes]", origin, "→", destination);
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
  };
  const resp: any = await postJson(
    "routes.googleapis.com",
    "/directions/v2:computeRoutes",
    apiKey,
    body
  );

  return (resp?.routes ?? [])
    .map((r: any) => {
      const dist =
        typeof r.distanceMeters === "number" ? r.distanceMeters : undefined;

      const durRaw = r?.duration;
      const seconds =
        typeof durRaw === "object"
          ? Number(durRaw?.seconds ?? durRaw?.value ?? durRaw)
          : typeof durRaw === "string"
          ? parseInt(durRaw.replace(/\D/g, ""), 10)
          : undefined;

      if (dist == null || seconds == null || Number.isNaN(seconds)) {
        return null;
      }
      return {
        distanceMeters: dist,
        durationSeconds: seconds,
        encoded: r?.polyline?.encodedPolyline,
      };
    })
    .filter(
      (
        x: unknown
      ): x is {
        distanceMeters: number;
        durationSeconds: number;
        encoded?: string;
      } => !!x
    );
}

/** Offset a point by km & bearing */
function offsetCoordinate(lat: number, lng: number, dKm: number, bDeg = 90) {
  const R = 6371,
    d = dKm / R,
    θ = (bDeg * Math.PI) / 180,
    φ1 = (lat * Math.PI) / 180,
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

function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const R = 6371;
  const φ1 = (a.lat * Math.PI) / 180,
    φ2 = (b.lat * Math.PI) / 180;
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

async function snapToRoad(
  pt: { lat: number; lng: number },
  apiKey: string,
  maxKm = 1
) {
  const url = `https://roads.googleapis.com/v1/nearestRoads?points=${pt.lat},${pt.lng}&key=${apiKey}`;
  console.info("[snapToRoad]", pt);
  try {
    const data: any = await fetchJson(url);
    const loc = data?.snappedPoints?.[0]?.location;
    console.info("[snapToRoad] snapped:", loc);
    if (!loc) return pt;
    const snapped = {
      lat: loc.latitude ?? loc.lat,
      lng: loc.longitude ?? loc.lng,
    };
    const d = distanceKm(pt, snapped);
    if (
      d > maxKm ||
      Math.abs(snapped.lat - pt.lat) > 1 ||
      Math.abs(snapped.lng - pt.lng) > 1
    ) {
      console.warn("[snapToRoad] snapped too far, ignored");
      return pt;
    }
    return snapped;
  } catch (err) {
    console.warn("[snapToRoad] failed:", err);
    return pt;
  }
}

function withinTarget(km: number, targetKm: number, pct = 0.15, absMax = 2) {
  const delta = Math.abs(km - targetKm);
  const tol = Math.max(absMax, targetKm * pct);
  return delta <= tol;
}

/**
 * Compute a multi-segment loop starting/ending at the origin.
 * Supports arbitrary segment counts (typical: 4, 6, 8).
 * Each segment is attempted with a full detour, then a half-radius detour,
 * and finally a direct leg to the origin if needed. If fewer than half the
 * segments succeed the route is discarded.
 */

/** MAIN LAMBDA HANDLER */
export const handler: SQSHandler = async (event) => {
  console.info("[handler] event", JSON.stringify(event, null, 2));
  const key = await getGoogleKey();

  for (const { body } of event.Records) {
    console.info("[handler] record", body);
    try {
      const {
        jobId,
        origin,
        destination,
        distanceKm,
        roundTrip = false,
        circle = false,
        routesCount = 3,
      } = JSON.parse(body);

      const oCoords = await generator.geocode(origin, key);
      const dCoords = destination
        ? await generator.geocode(destination, key)
        : undefined;

      const saved: Route[] = [];
      const seen = new Set<string>();
      let circularCount = 0;
      const circularGoal = Math.ceil(routesCount * 0.66);
      let attempts = 0,
        maxAt = routesCount * 10;
      console.info(`[handler] max attempts: ${maxAt}`);

    while (saved.length < routesCount && attempts++ < maxAt) {
      console.info(
        `[handler] attempt ${attempts}, have ${saved.length}/${routesCount}`
      );

      if (dCoords) {
        const alts = await computeRoutes(oCoords, dCoords, key);
        const shuffled = alts.sort(() => Math.random() - 0.5);
        for (const alt of shuffled) {
          if (saved.length >= routesCount) break;
          const km = alt.distanceMeters / 1000;
          const target = distanceKm ?? km;
          if (!withinTarget(km, target)) {
            console.warn("[handler] p2p out of range", km);
            continue;
          }
          const hash = alt.encoded
            ? createHash("md5").update(alt.encoded).digest("hex")
            : undefined;
          if (hash && seen.has(hash)) continue;
          const r = await generator.persistRoute(
            jobId,
            km,
            alt.durationSeconds,
            alt.encoded
          );
          if (hash) seen.add(hash);
          saved.push(r);
        }
      } else {
        let leg: {
          distanceMeters: number;
          durationSeconds: number;
          encoded: string;
        } | null = null;
        let isCircular = false;
        if (roundTrip && circle) {
          const segOptions = [4, 5, 6, 8, 10];
          const radiusOpts = [1.1, 1, 0.85, 0.7, 0.55, 0.4];
          outer: for (const segs of segOptions) {
            const step = 360 / segs;
            for (const rMul of radiusOpts) {
              const tries = 2 + Math.floor(Math.random() * 2);
              for (let t = 0; t < tries; t++) {
                const bearing =
                  Math.random() * 360 + (Math.random() * 2 - 1) * step * 0.25;
                leg = await generator.computeCircularRoute(
                  oCoords,
                  distanceKm!,
                  segs,
                  key,
                  bearing,
                  rMul
                );
                if (leg) {
                  let km = leg.distanceMeters / 1000;
                  let adjust = 0;
                  while (!withinTarget(km, distanceKm!) && adjust < 2) {
                    const rm = Math.min(1.3, Math.max(0.4, distanceKm! / km));
                    leg = await generator.computeCircularRoute(
                      oCoords,
                      distanceKm!,
                      segs,
                      key,
                      bearing,
                      rm
                    );
                    if (!leg) break;
                    km = leg.distanceMeters / 1000;
                    adjust++;
                  }
                  if (
                    leg &&
                    withinTarget(leg.distanceMeters / 1000, distanceKm!)
                  ) {
                    isCircular = true;
                    break outer;
                  }
                }
              }
            }
          }
          if (!leg) {
            console.warn(
              "[handler] circular failed, fallback to simple round-trip"
            );
            const bearing = Math.random() * 360;
            const half = distanceKm! / 2;
            const rawDest = offsetCoordinate(
              oCoords.lat,
              oCoords.lng,
              half,
              bearing
            );
            const snapped =
              half > SNAP_THRESHOLD_KM
                ? await snapToRoad(rawDest, key)
                : rawDest;
            const [out] = await computeRoutes(oCoords, snapped, key);
            const [back] = await computeRoutes(snapped, oCoords, key);
            if (out?.encoded && back?.encoded) {
              const c1 = new Path(out.encoded).Coordinates;
              const c2 = new Path(back.encoded).Coordinates.slice(1);
              const poly = Path.fromCoordinates([...c1, ...c2]).Encoded;
              leg = {
                distanceMeters: out.distanceMeters + back.distanceMeters,
                durationSeconds: out.durationSeconds + back.durationSeconds,
                encoded: poly,
              };
            }
          }
        } else {
          // existing out-and-back
          const bearing = Math.random() * 360;
          console.info("[handler] random bearing", bearing);
          const half = roundTrip ? distanceKm! / 2 : distanceKm!;
          const rawDest = offsetCoordinate(
            oCoords.lat,
            oCoords.lng,
            half,
            bearing
          );
          const snapped =
            half > SNAP_THRESHOLD_KM ? await snapToRoad(rawDest, key) : rawDest;
          const [out] = await computeRoutes(oCoords, snapped, key);
          if (!out) continue;

          if (!roundTrip) {
            leg = out;
          } else {
            const [back] = await computeRoutes(snapped, oCoords, key);
            if (!back) continue;
            const c1 = new Path(out.encoded).Coordinates;
            const c2 = new Path(back.encoded).Coordinates.slice(1);
            leg = {
              distanceMeters: out.distanceMeters + back.distanceMeters,
              durationSeconds: out.durationSeconds + back.durationSeconds,
              encoded: Path.fromCoordinates([...c1, ...c2]).Encoded,
            };
          }
        }

        if (leg) {
          const km = leg.distanceMeters / 1000;
          if (!withinTarget(km, distanceKm!)) {
            console.warn("[handler] dist-only out of range", km);
            continue;
          }
          if (circle && !isCircular && circularCount < circularGoal) {
            console.warn(
              "[handler] skipping fallback until enough circular routes"
            );
            continue;
          }
          const hash2 = leg.encoded
            ? createHash("md5").update(leg.encoded).digest("hex")
            : undefined;
          if (hash2 && seen.has(hash2)) continue;
          const r = await generator.persistRoute(
            jobId,
            km,
            leg.durationSeconds,
            leg.encoded
          );
          if (hash2) seen.add(hash2);
          saved.push(r);
          if (isCircular) circularCount++;
        }
      }
    }

    if (saved.length) {
      console.info(`[handler] publishing ${saved.length} routes`);
      await publishRoutesGenerated(jobId, saved);
      if (process.env.METRICS_QUEUE) {
        await sqs.send(
          new SendMessageCommand({
            QueueUrl: process.env.METRICS_QUEUE!,
            MessageBody: JSON.stringify({
              event: "routes_generated",
              jobId,
              count: saved.length,
              timestamp: Date.now(),
            }),
          })
        );
      }
    } else {
      console.warn(`[handler] no routes after ${maxAt} attempts`);
    }
  } catch (err: any) {
    console.error("[handler] error processing record", err);
    await publishErrorOccurred(err?.message || "Unknown error", body);
  }
}
};


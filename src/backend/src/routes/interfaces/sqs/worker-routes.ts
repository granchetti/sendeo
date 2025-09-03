import { SQSHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { request as httpsRequest, RequestOptions } from "node:https";
import { createHash } from "node:crypto";
import { Route } from "../../domain/entities/route-entity";
import { DistanceKm } from "../../domain/value-objects/distance-value-object";
import { Duration } from "../../domain/value-objects/duration-value-object";
import { Path } from "../../domain/value-objects/path-value-object";
import { UUID } from "../../../shared/domain/value-objects/uuid-value-object";
import { DynamoRouteRepository } from "../../infrastructure/dynamodb/dynamo-route-repository";
import { publishRoutesGenerated } from "../appsync-client";
import { fetchJson, getGoogleKey } from "../shared/utils";

const dynamo = new DynamoDBClient({});
const sqs = new SQSClient({});
const repository = new DynamoRouteRepository(dynamo, process.env.ROUTES_TABLE!);
const SNAP_THRESHOLD_KM = 0.5;

/** Geocode or parse “lat,lng” */
async function geocode(address: string, apiKey: string) {
  console.info("[geocode] start:", address);
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
  if (!loc) throw new Error(`Geocoding failed for "${address}"`);
  console.info("[geocode] geocoded to:", loc.lat, loc.lng);
  return { lat: loc.lat, lng: loc.lng };
}

/** POST → JSON for legacy Routes API */
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

/** Compute alternative walking routes */
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
        x
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

/** Simple haversine distance in km */
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

/** Snap a point to the nearest road */
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
async function computeCircularRoute(
  origin: { lat: number; lng: number },
  dKm: number,
  segments: number,
  apiKey: string,
  startBearing = 0,
  radiusMultiplier = 1
) {
  console.info("[computeCircularRoute] start", origin, "dKm=", dKm);
  const baseRadius = (dKm / (2 * Math.PI)) * radiusMultiplier;
  const step = 360 / segments;
  const angles: number[] = [];
  // build & snap waypoints at full radius
  const waypoints = [];
  for (let i = 0; i < segments; i++) {
    const jitter = (Math.random() * 2 - 1) * step * 0.25;
    const angle = startBearing + step * i + jitter;
    angles.push(angle);
    const raw = offsetCoordinate(origin.lat, origin.lng, baseRadius, angle);
    const snapped =
      baseRadius > SNAP_THRESHOLD_KM ? await snapToRoad(raw, apiKey) : raw;
    const pt =
      snapped.lat === origin.lat && snapped.lng === origin.lng ? raw : snapped;
    waypoints.push(pt);
  }

  // stitch legs with per-segment recovery
  let totalDist = 0,
    totalDur = 0,
    encoded: string | undefined,
    prev = origin,
    success = 0;
  for (let i = 0; i < segments; i++) {
    const angle = angles[i];
    const primary = waypoints[i];
    const halfRaw = offsetCoordinate(
      origin.lat,
      origin.lng,
      baseRadius * 0.5,
      angle
    );
    const halfSnap =
      baseRadius > SNAP_THRESHOLD_KM
        ? await snapToRoad(halfRaw, apiKey)
        : halfRaw;
    const half =
      halfSnap.lat === origin.lat && halfSnap.lng === origin.lng
        ? halfRaw
        : halfSnap;
    const candidates = [primary, half, origin];
    let leg: any = null,
      used = primary;
    for (let attempt = 0; attempt < candidates.length; attempt++) {
      const dest = candidates[attempt];
      const legs = await computeRoutes(prev, dest, apiKey);
      const cand = legs[0];
      if (cand?.encoded) {
        leg = cand;
        used = dest;
        if (attempt > 0)
          console.warn(
            `[computeCircularRoute] segment ${i} fallback attempt ${attempt}`
          );
        break;
      }
    }
    if (!leg) {
      console.warn(`[computeCircularRoute] segment ${i} failed`);
      // try to close directly to origin and exit
      const legs = await computeRoutes(prev, origin, apiKey);
      const closeLeg = legs[0];
      if (closeLeg?.encoded) {
        console.warn(
          `[computeCircularRoute] segment ${i} forced direct origin to close`
        );
        leg = closeLeg;
        used = origin;
      } else {
        break;
      }
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
    prev = used;
    success++;
    if (prev.lat === origin.lat && prev.lng === origin.lng) break;
  }

  // ensure loop closure
  if (prev.lat !== origin.lat || prev.lng !== origin.lng) {
    const legs = await computeRoutes(prev, origin, apiKey);
    const leg = legs[0];
    if (leg?.encoded) {
      console.warn("[computeCircularRoute] closing loop to origin");
      totalDist += leg.distanceMeters;
      totalDur += leg.durationSeconds;
      if (encoded) {
        const c1 = new Path(encoded).Coordinates;
        const c2 = new Path(leg.encoded).Coordinates.slice(1);
        encoded = Path.fromCoordinates([...c1, ...c2]).Encoded;
      } else {
        encoded = leg.encoded;
      }
      success++;
      prev = origin;
    }
  }

  const closed = prev.lat === origin.lat && prev.lng === origin.lng;
  if (!encoded || (!closed && success < segments / 2)) return null;
  return { distanceMeters: totalDist, durationSeconds: totalDur, encoded };
}

/** Persist a single Route entity */
async function persistRoute(
  jobId: string,
  km: number,
  dur: number,
  poly?: string
) {
  const r = Route.request({
    routeId: UUID.generate(),
    jobId: UUID.fromString(jobId),
  });
  r.generate(
    new DistanceKm(km),
    new Duration(dur),
    poly ? new Path(poly) : undefined
  );
  await repository.save(r);
  console.info("[persistRoute] saved:", r);
  return r;
}

/** MAIN LAMBDA HANDLER */
export const handler: SQSHandler = async (event) => {
  console.info("[handler] event", JSON.stringify(event, null, 2));
  const key = await getGoogleKey();

  for (const { body } of event.Records) {
    console.info("[handler] record", body);
    const {
      jobId,
      origin,
      destination,
      distanceKm,
      roundTrip = false,
      circle = false,
      routesCount = 3,
    } = JSON.parse(body);

    const oCoords = await geocode(origin, key);
    const dCoords = destination ? await geocode(destination, key) : undefined;

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
        // ——— point→point ———
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
          const r = await persistRoute(
            jobId,
            km,
            alt.durationSeconds,
            alt.encoded
          );
          if (hash) seen.add(hash);
          saved.push(r);
        }
      } else {
        // ——— distance-only ———
        let leg: {
          distanceMeters: number;
          durationSeconds: number;
          encoded: string;
        } | null = null;
        let isCircular = false;
        if (roundTrip && circle) {
          // try multiple circular configurations (segments, radius, bearing)
          const segOptions = [4, 5, 6, 8, 10];
          const radiusOpts = [1.1, 1, 0.85, 0.7, 0.55, 0.4];
          outer: for (const segs of segOptions) {
            const step = 360 / segs;
            for (const rMul of radiusOpts) {
              const tries = 2 + Math.floor(Math.random() * 2);
              for (let t = 0; t < tries; t++) {
                const bearing =
                  Math.random() * 360 + (Math.random() * 2 - 1) * step * 0.25;
                leg = await computeCircularRoute(
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
                    leg = await computeCircularRoute(
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
            // fall back to two legs: out and back
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
          // Solo aplaza el fallback si se pidieron circulares explícitamente
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
          const r = await persistRoute(
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
  }
};

export { geocode };

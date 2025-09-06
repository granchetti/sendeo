import { Route } from "../entities/route-entity";
import { RouteRepository } from "../repositories/route-repository";
import { DistanceKm } from "../value-objects/distance-value-object";
import { Duration } from "../value-objects/duration-value-object";
import { Path } from "../value-objects/path-value-object";
import { UUID } from "../../../shared/domain/value-objects/uuid-value-object";
import { fetchJson } from "../../interfaces/shared/utils";
import { request as httpsRequest, RequestOptions } from "node:https";

const SNAP_THRESHOLD_KM = 0.5;

export class RouteGenerator {
  constructor(private repository: RouteRepository) {}

  async geocode(address: string, apiKey: string) {
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

  private async postJson<T>(
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
        return this.postJson<T>(host, path, apiKey, body, attempt + 1);
      }
      console.error("[postJson] HTTP error", err);
      throw err;
    }
  }

  private async computeRoutes(
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
    const resp: any = await this.postJson(
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

  private offsetCoordinate(
    lat: number,
    lng: number,
    dKm: number,
    bDeg = 90
  ) {
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

  private distanceKm(
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

  private async snapToRoad(
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
      const d = this.distanceKm(pt, snapped);
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

  async computeCircularRoute(
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
    const waypoints = [];
    for (let i = 0; i < segments; i++) {
      const jitter = (Math.random() * 2 - 1) * step * 0.25;
      const angle = startBearing + step * i + jitter;
      angles.push(angle);
      const raw = this.offsetCoordinate(origin.lat, origin.lng, baseRadius, angle);
      const snapped =
        baseRadius > SNAP_THRESHOLD_KM ? await this.snapToRoad(raw, apiKey) : raw;
      const pt =
        snapped.lat === origin.lat && snapped.lng === origin.lng ? raw : snapped;
      waypoints.push(pt);
    }
    let totalDist = 0,
      totalDur = 0,
      encoded: string | undefined,
      prev = origin,
      success = 0;
    for (let i = 0; i < segments; i++) {
      const angle = angles[i];
      const primary = waypoints[i];
      const halfRaw = this.offsetCoordinate(
        origin.lat,
        origin.lng,
        baseRadius * 0.5,
        angle
      );
      const halfSnap =
        baseRadius > SNAP_THRESHOLD_KM
          ? await this.snapToRoad(halfRaw, apiKey)
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
        const legs = await this.computeRoutes(prev, dest, apiKey);
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
        const legs = await this.computeRoutes(prev, origin, apiKey);
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
      const legs = await this.computeRoutes(prev, origin, apiKey);
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

  async persistRoute(
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
    await this.repository.save(r);
    console.info("[persistRoute] saved:", r);
    return r;
  }
}


import { Route } from "../entities/route";
import { RouteRepository } from "../repositories/route-repository";
import { DistanceKm } from "../value-objects/distance";
import { Duration } from "../value-objects/duration";
import { Path } from "../value-objects/path";
import { UUID } from "../../../shared/domain/value-objects/uuid";
import { RouteProvider, RouteLeg } from "./route-provider";

const SNAP_THRESHOLD_KM = 0.5;

export class RouteGenerator {
  constructor(
    private repository: RouteRepository,
    private provider: RouteProvider
  ) {}

  async geocode(address: string) {
    return this.provider.geocode(address);
  }

  async computeRoutes(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Promise<RouteLeg[]> {
    return this.provider.computeRoutes(origin, destination);
  }

  async snapToRoad(
    pt: { lat: number; lng: number },
    maxKm = 1
  ): Promise<{ lat: number; lng: number }> {
    return this.provider.snapToRoad(pt, maxKm);
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

  async computeCircularRoute(
    origin: { lat: number; lng: number },
    dKm: number,
    segments: number,
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
        baseRadius > SNAP_THRESHOLD_KM ? await this.snapToRoad(raw) : raw;
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
          ? await this.snapToRoad(halfRaw)
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
        const legs = await this.computeRoutes(prev, dest);
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
        const legs = await this.computeRoutes(prev, origin);
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
      const legs = await this.computeRoutes(prev, origin);
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


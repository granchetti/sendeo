import { RouteProvider, RouteLeg } from "../../domain/services/route-provider";
import { fetchJson } from "../../interfaces/shared/utils";
import { request as httpsRequest, RequestOptions } from "node:https";

export class GoogleRoutesProvider implements RouteProvider {
  constructor(private apiKey: string) {}

  async geocode(address: string): Promise<{ lat: number; lng: number }> {
    const coordRx = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/;
    if (coordRx.test(address)) {
      const [lat, lng] = address.split(/\s*,\s*/).map(Number);
      return { lat, lng };
    }
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${this.apiKey}`;
    const res: any = await fetchJson(url);
    const loc = res?.results?.[0]?.geometry?.location;
    if (!loc) throw new Error(`Geocoding failed for "${address}"`);
    return { lat: loc.lat, lng: loc.lng };
  }

  private async postJson<T>(host: string, path: string, body: any): Promise<T | null> {
    const payload = JSON.stringify(body);
    const opts: RequestOptions = {
      method: "POST",
      host,
      path,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask":
          "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
      },
    };
    return new Promise<T | null>((resolve, reject) => {
      const req = httpsRequest(opts, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode !== 200) {
            const err: any = new Error(`Routes API returned HTTP ${res.statusCode}`);
            err.statusCode = res.statusCode;
            err.body = data;
            return reject(err);
          }
          resolve(data ? JSON.parse(data) : null);
        });
      });
      req.on("error", (err) => reject(err));
      req.write(payload);
      req.end();
    });
  }

  async computeRoutes(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Promise<RouteLeg[]> {
    const body = {
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: {
        location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
      },
      travelMode: "WALK",
      computeAlternativeRoutes: true,
    };
    const resp: any = await this.postJson(
      "routes.googleapis.com",
      "/directions/v2:computeRoutes",
      body
    );
    return (resp?.routes ?? [])
      .map((r: any) => {
        const dist = typeof r.distanceMeters === "number" ? r.distanceMeters : undefined;
        const durRaw = r?.duration;
        const seconds =
          typeof durRaw === "object"
            ? Number(durRaw?.seconds ?? durRaw?.value ?? durRaw)
            : typeof durRaw === "string"
            ? parseInt(durRaw.replace(/\D/g, ""), 10)
            : undefined;
        if (dist == null || seconds == null || Number.isNaN(seconds)) return null;
        return {
          distanceMeters: dist,
          durationSeconds: seconds,
          encoded: r?.polyline?.encodedPolyline ?? r?.legs?.[0]?.polyline?.encodedPolyline,
        } as RouteLeg;
      })
      .filter((x: RouteLeg | null): x is RouteLeg => !!x);
  }

  async snapToRoad(
    pt: { lat: number; lng: number },
    maxKm = 1
  ): Promise<{ lat: number; lng: number }> {
    const url = `https://roads.googleapis.com/v1/nearestRoads?points=${pt.lat},${pt.lng}&key=${this.apiKey}`;
    try {
      const data: any = await fetchJson(url);
      const loc = data?.snappedPoints?.[0]?.location;
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
        return pt;
      }
      return snapped;
    } catch {
      return pt;
    }
  }

  private distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    const R = 6371;
    const φ1 = (a.lat * Math.PI) / 180;
    const φ2 = (b.lat * Math.PI) / 180;
    const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
    const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
    const s =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }
}

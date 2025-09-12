export interface RouteLeg {
  distanceMeters: number;
  durationSeconds: number;
  encoded: string;
}
export interface RouteProvider {
  geocode(address: string): Promise<{ lat: number; lng: number }>;
  computeRoutes(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Promise<RouteLeg[]>;
  snapToRoad(
    pt: { lat: number; lng: number },
    maxKm?: number
  ): Promise<{ lat: number; lng: number }>;
}

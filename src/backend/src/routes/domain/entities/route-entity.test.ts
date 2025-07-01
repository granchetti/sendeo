import { Route } from "./route-entity";
import { RouteId } from "../value-objects/route-id-value-object";
import { DistanceKm } from "../value-objects/distance-value-object";
import { Duration } from "../value-objects/duration-value-object";
import { Path } from "../value-objects/path-value-object";
import { LatLng } from "../value-objects/lat-lng-value-object";

describe("Route", () => {
  it("should create a Route with all properties", () => {
    const routeId = RouteId.generate();
    const distance = new DistanceKm(10);
    const duration = new Duration(1200);
    const path = Path.fromCoordinates([
      LatLng.fromNumbers(41.38, 2.17),
      LatLng.fromNumbers(41.39, 2.18),
    ]);

    const route = new Route({
      routeId,
      distanceKm: distance,
      duration,
      path,
    });

    expect(route.routeId.equals(routeId)).toBe(true);
    expect(route.distanceKm?.Value).toBe(10);
    expect(route.duration?.Value).toBe(1200);
    expect(route.path?.Coordinates.map(v => ({ lat: v.Lat, lng: v.Lng }))).toEqual([
      { lat: 41.38, lng: 2.17 },
      { lat: 41.39, lng: 2.18 },
    ]);
  });

  it("should create a Route with only the required property", () => {
    const routeId = RouteId.generate();

    const route = new Route({
      routeId,
    });

    expect(route.routeId.equals(routeId)).toBe(true);
    expect(route.distanceKm).toBeUndefined();
    expect(route.duration).toBeUndefined();
    expect(route.path).toBeUndefined();
  });

  it("should throw an error if routeId is missing", () => {
    // @ts-expect-error - testing error when routeId is missing
    expect(() => new Route({})).toThrow("routeId is required");
  });
});

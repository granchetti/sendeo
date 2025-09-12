import { Route } from "./route";
import { UUID } from "../../../shared/domain/value-objects/uuid";
import { DistanceKm } from "../value-objects/distance";
import { Duration } from "../value-objects/duration";
import { Path } from "../value-objects/path";
import { LatLng } from "../value-objects/lat-lng";
import { RouteGeneratedEvent } from "../events/route-generated";
import { RouteStatus } from "../value-objects/route-status";

describe("Route", () => {
  it("should create a Route in requested status", () => {
    const routeId = UUID.generate();
    const route = Route.request({ routeId });
    const events = route.pullEvents();
    expect(events.length).toBe(0);
    expect(route.routeId.equals(routeId)).toBe(true);
    expect(route.status).toBe(RouteStatus.Requested);
  });

  it("should generate details and record RouteGeneratedEvent", () => {
    const routeId = UUID.generate();
    const route = Route.request({ routeId });
    route.pullEvents(); // clear requested

    const distance = new DistanceKm(10);
    const duration = new Duration(1200);
    const path = Path.fromCoordinates([
      LatLng.fromNumbers(41.38, 2.17),
      LatLng.fromNumbers(41.39, 2.18),
    ]);

    route.generate(distance, duration, path);

    expect(route.distanceKm?.Value).toBe(10);
    expect(route.duration?.Value).toBe(1200);
    expect(route.path?.Coordinates.map((v) => ({ lat: v.Lat, lng: v.Lng }))).toEqual([
      { lat: 41.38, lng: 2.17 },
      { lat: 41.39, lng: 2.18 },
    ]);

    const events = route.pullEvents();
    expect(events[0]).toBeInstanceOf(RouteGeneratedEvent);
    expect(route.status).toBe(RouteStatus.Generated);

    route.start();
    expect(route.status).toBe(RouteStatus.Started);

    route.finish();
    expect(route.status).toBe(RouteStatus.Finished);
  });

  it("should throw an error if routeId is missing", () => {
    // @ts-expect-error - testing error when routeId is missing
    expect(() => Route.request({})).toThrow("routeId is required");
  });
});

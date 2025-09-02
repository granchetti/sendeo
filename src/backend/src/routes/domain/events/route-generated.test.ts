import { RouteGeneratedEvent } from "./route-generated";
import { Route } from "../entities/route-entity";
import { UUID } from "../value-objects/uuid-value-object";
import { DistanceKm } from "../value-objects/distance-value-object";
import { Duration } from "../value-objects/duration-value-object";
import { Path } from "../value-objects/path-value-object";
import { LatLng } from "../value-objects/lat-lng-value-object";

describe("RouteGeneratedEvent", () => {
  it("should hold the generated route", () => {
    const route = Route.request({ routeId: UUID.generate() });
    route.generate(
      new DistanceKm(1),
      new Duration(60),
      Path.fromCoordinates([
        LatLng.fromNumbers(0, 0),
        LatLng.fromNumbers(1, 1),
      ])
    );
    const event = new RouteGeneratedEvent({ route });
    expect(event.route).toBe(route);
    expect(event.eventName).toBe("RouteGenerated");
  });
});

import { RouteGeneratedEvent } from "./route-generated";
import { Route } from "../entities/route";
import { UUID } from "../../../shared/domain/value-objects/uuid";
import { DistanceKm } from "../value-objects/distance";
import { Duration } from "../value-objects/duration";
import { Path } from "../value-objects/path";
import { LatLng } from "../value-objects/lat-lng";

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

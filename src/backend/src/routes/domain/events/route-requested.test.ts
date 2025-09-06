import { UUID } from "../../../shared/domain/value-objects/uuid";
import { RouteRequestedEvent } from "./route-requested";

describe("RouteRequestedEvent", () => {
  it("should store provided properties", () => {
    const routeId = UUID.generate();
    const event = new RouteRequestedEvent({ routeId });
    expect(event.routeId).toBe(routeId);
    expect(event.eventName).toBe("RouteRequested");
  });
});

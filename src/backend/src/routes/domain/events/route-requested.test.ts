import { RouteRequestedEvent } from "./route-requested";
import { UUID } from "../value-objects/uuid-value-object";

describe("RouteRequestedEvent", () => {
  it("should store provided properties", () => {
    const routeId = UUID.generate();
    const event = new RouteRequestedEvent({ routeId });
    expect(event.routeId).toBe(routeId);
    expect(event.eventName).toBe("RouteRequested");
  });
});

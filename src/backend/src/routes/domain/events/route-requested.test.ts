import { UUID } from "../../../shared/domain/value-objects/uuid";
import { RouteRequestedEvent } from "./route-requested";

describe("RouteRequestedEvent", () => {
  it("should store provided properties", () => {
    const routeId = UUID.generate();
    const jobId = UUID.generate();
    const correlationId = UUID.generate();
    const event = new RouteRequestedEvent({
      routeId,
      version: 1,
      jobId,
      origin: "A",
      destination: "B",
      distanceKm: 10,
      correlationId,
    });
    expect(event.routeId).toBe(routeId);
    expect(event.jobId).toBe(jobId);
    expect(event.origin).toBe("A");
    expect(event.destination).toBe("B");
    expect(event.distanceKm).toBe(10);
    expect(event.correlationId).toBe(correlationId);
    expect(event.eventName).toBe("RouteRequested");
  });
});

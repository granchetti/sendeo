import { UUID } from "../../../shared/domain/value-objects/uuid";
import { RouteRequestedEvent } from "./route-requested";

describe("RouteRequestedEvent", () => {
  it("should store provided properties", () => {
    const routeId = UUID.generate();
    const jobId = UUID.generate();
    const corr = UUID.generate();
    const event = new RouteRequestedEvent({
      routeId,
      jobId,
      origin: "A",
      version: 1,
      correlationId: corr,
    });
    expect(event.routeId).toBe(routeId);
    expect(event.jobId).toBe(jobId);
    expect(event.origin).toBe("A");
    expect(event.correlationId).toBe(corr);
    expect(event.eventName).toBe("RouteRequested");
  });
});

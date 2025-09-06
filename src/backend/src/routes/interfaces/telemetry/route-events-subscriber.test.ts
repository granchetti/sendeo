import { registerTelemetrySubscribers } from "./route-events-subscriber";
import { EventDispatcher } from "../../../shared/domain/events/event-dispatcher";
import { RouteRequestedEvent } from "../../domain/events/route-requested";
import { RouteGeneratedEvent } from "../../domain/events/route-generated";
import { UUID } from "../../../shared/domain/value-objects/uuid-value-object";
import { Route } from "../../domain/entities/route-entity";
import { RouteStatus } from "../../domain/value-objects/route-status";

describe("registerTelemetrySubscribers", () => {
  let subscribe: jest.Mock;
  let dispatcher: EventDispatcher;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    subscribe = jest.fn();
    dispatcher = {
      subscribe,
      publish: jest.fn(),
      publishAll: jest.fn(),
    } as unknown as EventDispatcher;

    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("logs telemetry when route events are dispatched", () => {
    registerTelemetrySubscribers(dispatcher);

    expect(subscribe).toHaveBeenCalledTimes(2);
    const [requestedEventName, requestedHandler] = subscribe.mock.calls[0];
    const [generatedEventName, generatedHandler] = subscribe.mock.calls[1];

    expect(requestedEventName).toBe("RouteRequested");
    expect(generatedEventName).toBe("RouteGenerated");

    const routeId = UUID.generate();
    requestedHandler(new RouteRequestedEvent({ routeId }));
    expect(consoleSpy).toHaveBeenNthCalledWith(
      1,
      "Telemetry: route requested",
      routeId.Value
    );

    const route = Route.rehydrate({ routeId, status: RouteStatus.Generated });
    generatedHandler(new RouteGeneratedEvent({ route }));
    expect(consoleSpy).toHaveBeenNthCalledWith(
      2,
      "Telemetry: route generated",
      route.routeId.Value
    );
  });
});


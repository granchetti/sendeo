import { registerTelemetrySubscribers } from "./route-events-subscriber";
import { EventDispatcher } from "../../../shared/domain/events/event-dispatcher";
import { RouteRequestedEvent } from "../../domain/events/route-requested";
import { RouteGeneratedEvent } from "../../domain/events/route-generated";
import { RouteStartedEvent } from "../../domain/events/route-started";
import { RouteFinishedEvent } from "../../domain/events/route-finished";
import { RouteStatus } from "../../domain/value-objects/route-status";
import { UUID } from "../../../shared/domain/value-objects/uuid";
import { Route } from "../../domain/entities/route";

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

    expect(subscribe).toHaveBeenCalledTimes(4);
    const [requestedEventName, requestedHandler] = subscribe.mock.calls[0];
    const [generatedEventName, generatedHandler] = subscribe.mock.calls[1];
    const [startedEventName, startedHandler] = subscribe.mock.calls[2];
    const [finishedEventName, finishedHandler] = subscribe.mock.calls[3];

    expect(requestedEventName).toBe("RouteRequested");
    expect(generatedEventName).toBe("RouteGenerated");
    expect(startedEventName).toBe("RouteStarted");
    expect(finishedEventName).toBe("RouteFinished");

    const routeId = UUID.generate();
    requestedHandler(new RouteRequestedEvent({ routeId }));
    expect(consoleSpy).toHaveBeenNthCalledWith(
      1,
      "Telemetry: route requested",
      routeId.Value
    );

    const generatedRoute = Route.rehydrate({ routeId, status: RouteStatus.Generated });
    generatedHandler(new RouteGeneratedEvent({ route: generatedRoute }));
    expect(consoleSpy).toHaveBeenNthCalledWith(
      2,
      "Telemetry: route generated",
      generatedRoute.routeId.Value
    );

    const startTimestamp = 1;
    const startedRoute = Route.rehydrate({ routeId, status: RouteStatus.Started });
    startedHandler(
      new RouteStartedEvent({
        route: startedRoute,
        email: "user@example.com",
        timestamp: startTimestamp,
      })
    );
    expect(consoleSpy).toHaveBeenNthCalledWith(
      3,
      "Telemetry: route started",
      startedRoute.routeId.Value,
      "user@example.com",
      startTimestamp
    );

    const finishTimestamp = 2;
    const actualDuration = 1;
    const finishedRoute = Route.rehydrate({ routeId, status: RouteStatus.Finished });
    finishedHandler(
      new RouteFinishedEvent({
        route: finishedRoute,
        email: "user@example.com",
        timestamp: finishTimestamp,
        actualDuration,
      })
    );
    expect(consoleSpy).toHaveBeenNthCalledWith(
      4,
      "Telemetry: route finished",
      finishedRoute.routeId.Value,
      "user@example.com",
      finishTimestamp,
      actualDuration
    );
  });
});


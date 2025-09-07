import { EventDispatcher } from "../../../shared/domain/events/event-dispatcher";
import { RouteRequestedEvent } from "../../domain/events/route-requested";
import { RouteGeneratedEvent } from "../../domain/events/route-generated";
import { RouteStartedEvent } from "../../domain/events/route-started";
import { RouteFinishedEvent } from "../../domain/events/route-finished";

export function registerTelemetrySubscribers(dispatcher: EventDispatcher): void {
  dispatcher.subscribe("RouteRequested", (event: RouteRequestedEvent) => {
    console.log("Telemetry: route requested", event.routeId.Value);
  });
  dispatcher.subscribe("RouteGenerated", (event: RouteGeneratedEvent) => {
    console.log("Telemetry: route generated", event.route.routeId.Value);
  });
  dispatcher.subscribe("RouteStarted", (event: RouteStartedEvent) => {
    console.log(
      "Telemetry: route started",
      event.route.routeId.Value,
      event.email,
      event.timestamp
    );
  });
  dispatcher.subscribe("RouteFinished", (event: RouteFinishedEvent) => {
    console.log(
      "Telemetry: route finished",
      event.route.routeId.Value,
      event.email,
      event.timestamp,
      event.actualDuration
    );
  });
}

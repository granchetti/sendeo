import { InMemoryEventDispatcher } from "../../../shared/domain/events/event-dispatcher";
import { RouteRequestedEvent } from "../../domain/events/route-requested";
import { RouteGeneratedEvent } from "../../domain/events/route-generated";

export function registerTelemetrySubscribers(dispatcher: InMemoryEventDispatcher): void {
  dispatcher.subscribe("RouteRequested", (event: RouteRequestedEvent) => {
    console.log("Telemetry: route requested", event.routeId.Value);
  });
  dispatcher.subscribe("RouteGenerated", (event: RouteGeneratedEvent) => {
    console.log("Telemetry: route generated", event.route.routeId.Value);
  });
}

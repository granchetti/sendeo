import { DomainEvent } from "../../../shared/domain/events/domain-event";
import { UUID } from "../../../shared/domain/value-objects/uuid";

export interface RouteRequestedProps {
  readonly routeId: UUID;
}

export class RouteRequestedEvent extends DomainEvent {
  readonly eventName = "RouteRequested";
  readonly routeId: UUID;

  constructor(props: RouteRequestedProps) {
    super();
    this.routeId = props.routeId;
  }
}

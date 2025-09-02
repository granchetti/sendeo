import { DomainEvent } from "../../../shared/domain/events/domain-event";
import { UUID } from "../value-objects/uuid-value-object";

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

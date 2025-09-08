import { DomainEvent } from "../../../shared/domain/events/domain-event";
import { Route } from "../entities/route";

export interface RouteStartedProps {
  readonly route: Route;
  readonly email: string;
  readonly timestamp: number;
}

export class RouteStartedEvent extends DomainEvent {
  readonly eventName = "RouteStarted";
  readonly route: Route;
  readonly email: string;
  readonly timestamp: number;

  constructor(props: RouteStartedProps) {
    super();
    this.route = props.route;
    this.email = props.email;
    this.timestamp = props.timestamp;
  }
}

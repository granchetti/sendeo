import { DomainEvent } from "../../../shared/domain/events/domain-event";
import { Route } from "../entities/route-entity";

export interface RouteFinishedProps {
  readonly route: Route;
  readonly email: string;
  readonly timestamp: number;
  readonly actualDuration?: number;
}

export class RouteFinishedEvent extends DomainEvent {
  readonly eventName = "RouteFinished";
  readonly route: Route;
  readonly email: string;
  readonly timestamp: number;
  readonly actualDuration?: number;

  constructor(props: RouteFinishedProps) {
    super();
    this.route = props.route;
    this.email = props.email;
    this.timestamp = props.timestamp;
    this.actualDuration = props.actualDuration;
  }
}

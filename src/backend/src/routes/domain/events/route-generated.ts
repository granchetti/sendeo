import { DomainEvent } from "../../../shared/domain/events/domain-event";
import { Route } from "../entities/route-entity";

export interface RouteGeneratedProps {
  readonly route: Route;
}

export class RouteGeneratedEvent extends DomainEvent {
  readonly eventName = "RouteGenerated";
  readonly route: Route;

  constructor(props: RouteGeneratedProps) {
    super();
    this.route = props.route;
  }
}

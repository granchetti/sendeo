import { Route } from '../entities/route-entity';

export interface RouteGeneratedProps {
  readonly route: Route;
}

export class RouteGeneratedEvent {
  readonly route: Route;

  constructor(props: RouteGeneratedProps) {
    this.route = props.route;
  }
}
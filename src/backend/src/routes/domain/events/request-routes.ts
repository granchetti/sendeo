import { RouteId } from '../value-objects/route-id-value-object';

export interface RequestRoutesProps {
  readonly routeId: RouteId;
  readonly origin: string;
  readonly destination: string;
}

export class RequestRoutesEvent {
  readonly routeId: RouteId;
  readonly origin: string;
  readonly destination: string;

  constructor(props: RequestRoutesProps) {
    this.routeId = props.routeId;
    this.origin = props.origin;
    this.destination = props.destination;
  }
}
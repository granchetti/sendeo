import { DomainEvent } from "../../../shared/domain/events/domain-event";
import { UUID } from "../../../shared/domain/value-objects/uuid";

export interface RouteRequestedProps {
  readonly routeId: UUID;
  readonly version?: number;
  readonly jobId?: UUID;
  readonly origin?: string;
  readonly destination?: string;
  readonly distanceKm?: number;
  readonly roundTrip?: boolean;
  readonly circle?: boolean;
  readonly routesCount?: number;
  readonly preference?: string;
  readonly correlationId?: UUID;
}

export class RouteRequestedEvent extends DomainEvent {
  readonly eventName = "RouteRequested";
  readonly routeId: UUID;
  readonly version?: number;
  readonly jobId?: UUID;
  readonly origin?: string;
  readonly destination?: string;
  readonly distanceKm?: number;
  readonly roundTrip?: boolean;
  readonly circle?: boolean;
  readonly routesCount?: number;
  readonly preference?: string;
  readonly correlationId?: UUID;

  constructor(props: RouteRequestedProps) {
    super();
    this.routeId = props.routeId;
    this.version = props.version;
    this.jobId = props.jobId;
    this.origin = props.origin;
    this.destination = props.destination;
    this.distanceKm = props.distanceKm;
    this.roundTrip = props.roundTrip;
    this.circle = props.circle;
    this.routesCount = props.routesCount;
    this.preference = props.preference;
    this.correlationId = props.correlationId;
  }
}

import { DomainEvent } from "../../../shared/domain/events/domain-event";
import { UUID } from "../../../shared/domain/value-objects/uuid";

export interface RouteRequestedProps {
  readonly routeId: UUID;
  readonly jobId: UUID;
  readonly origin: string;
  readonly destination?: string;
  readonly distanceKm?: number;
  readonly routesCount?: number;
  readonly correlationId?: UUID;
  readonly version: number;
}

export class RouteRequestedEvent extends DomainEvent {
  readonly eventName = "RouteRequested";
  readonly routeId: UUID;
  readonly jobId: UUID;
  readonly origin: string;
  readonly destination?: string;
  readonly distanceKm?: number;
  readonly routesCount?: number;
  readonly correlationId?: UUID;
  readonly version: number;

  constructor(props: RouteRequestedProps) {
    super();
    this.routeId = props.routeId;
    this.jobId = props.jobId;
    this.origin = props.origin;
    this.destination = props.destination;
    this.distanceKm = props.distanceKm;
    this.routesCount = props.routesCount;
    this.correlationId = props.correlationId;
    this.version = props.version;
  }
}

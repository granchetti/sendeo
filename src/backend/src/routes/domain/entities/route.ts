import { DistanceKm } from "../value-objects/distance";
import { Duration } from "../value-objects/duration";
import { Path } from "../value-objects/path";
import { UUID } from "../../../shared/domain/value-objects/uuid";
import { DomainEvent } from "../../../shared/domain/events/domain-event";
import { RouteRequestedEvent } from "../events/route-requested";
import { RouteGeneratedEvent } from "../events/route-generated";
import { RouteStatus } from "../value-objects/route-status";

export interface RouteProps {
  readonly routeId: UUID;
  readonly jobId?: UUID;
  distanceKm?: DistanceKm;
  duration?: Duration;
  path?: Path;
  description?: string;
  status: RouteStatus;
}

export class Route {
  private props: RouteProps;
  private events: DomainEvent[] = [];

  private constructor(props: RouteProps) {
    if (!props.routeId) {
      throw new Error("routeId is required");
    }
    this.props = { ...props };
  }

  static request(props: Omit<RouteProps, "status">): Route {
    const route = new Route({ ...props, status: RouteStatus.Requested });
    route.record(new RouteRequestedEvent({ routeId: route.routeId }));
    return route;
  }

  static rehydrate(props: RouteProps): Route {
    return new Route(props);
  }

  generate(distanceKm: DistanceKm, duration: Duration, path?: Path): void {
    this.props.distanceKm = distanceKm;
    this.props.duration = duration;
    if (path) this.props.path = path;
    this.props.status = RouteStatus.Generated;
    this.record(new RouteGeneratedEvent({ route: this }));
  }

  start(): void {
    if (!this.props.distanceKm || !this.props.path) {
      throw new Error("distanceKm and path must be set before starting");
    }
    if (this.props.status !== RouteStatus.Generated) {
      throw new Error("route must be generated before starting");
    }
    this.props.status = RouteStatus.Started;
  }

  finish(): void {
    if (!this.props.distanceKm || !this.props.path) {
      throw new Error("distanceKm and path must be set before finishing");
    }
    if (this.props.status !== RouteStatus.Started) {
      throw new Error("route must be started before finishing");
    }
    this.props.status = RouteStatus.Finished;
  }

  private record(event: DomainEvent): void {
    this.events.push(event);
  }

  pullEvents(): DomainEvent[] {
    const events = [...this.events];
    this.events = [];
    return events;
  }

  get jobId(): UUID | undefined {
    return this.props.jobId;
  }

  get routeId(): UUID {
    return this.props.routeId;
  }

  get distanceKm(): DistanceKm | undefined {
    return this.props.distanceKm;
  }

  get duration(): Duration | undefined {
    return this.props.duration;
  }

  get path(): Path | undefined {
    return this.props.path;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  set description(desc: string | undefined) {
    this.props.description = desc;
  }

  get status(): RouteStatus {
    return this.props.status;
  }
}

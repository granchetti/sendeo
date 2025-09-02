import { DistanceKm } from "../value-objects/distance-value-object";
import { Duration } from "../value-objects/duration-value-object";
import { Path } from "../value-objects/path-value-object";
import { UUID } from "../value-objects/uuid-value-object";
import { DomainEvent } from "../../../shared/domain/events/domain-event";
import { RouteRequestedEvent } from "../events/route-requested";
import { RouteGeneratedEvent } from "../events/route-generated";

export interface RouteProps {
  readonly routeId: UUID;
  readonly jobId?: UUID;
  readonly distanceKm?: DistanceKm;
  readonly duration?: Duration;
  readonly path?: Path;
  readonly description?: string;
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

  static request(props: RouteProps): Route {
    const route = new Route(props);
    route.record(new RouteRequestedEvent({ routeId: route.routeId }));
    return route;
  }

  generate(distanceKm: DistanceKm, duration: Duration, path: Path): void {
    this.props.distanceKm = distanceKm;
    this.props.duration = duration;
    this.props.path = path;
    this.record(new RouteGeneratedEvent({ route: this }));
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
}

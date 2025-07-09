import { DistanceKm } from "../value-objects/distance-value-object";
import { Duration } from "../value-objects/duration-value-object";
import { Path } from "../value-objects/path-value-object";
import { UUID } from "../value-objects/uuid-value-object";

export interface RouteProps {
  readonly routeId: UUID;
  readonly jobId?: UUID;
  readonly distanceKm?: DistanceKm;
  readonly duration?: Duration;
  readonly path?: Path;
}

export class Route {
  private props: RouteProps;

  constructor(props: RouteProps) {
    if (!props.routeId) {
      throw new Error("routeId is required");
    }
    this.props = { ...props};
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
}

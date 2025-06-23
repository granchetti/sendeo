export interface RouteProps {
  routeId: string;
  distanceKm?: number;
  duration?: number;
  path?: string;
}

export class Route {
  private props: RouteProps;

  constructor(props: RouteProps) {
    if (!props.routeId) {
      throw new Error("routeId is required");
    }
    this.props = props;
  }

  get routeId(): string {
    return this.props.routeId;
  }

  get distanceKm(): number | undefined {
    return this.props.distanceKm;
  }

  get duration(): number | undefined {
    return this.props.duration;
  }

  get path(): string | undefined {
    return this.props.path;
  }
}

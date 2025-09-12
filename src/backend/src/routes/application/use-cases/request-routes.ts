import { RouteRepository } from "../../domain/repositories/route-repository";
import { Route, RouteProps } from "../../domain/entities/route";
import { EventDispatcher } from "../../../shared/domain/events/event-dispatcher";
import { RouteRequestedProps } from "../../domain/events/route-requested";

export interface RequestRoutesInput
  extends Omit<RouteProps, "status">,
    Omit<RouteRequestedProps, "routeId"> {}

export class RequestRoutesUseCase {
  constructor(
    private repository: RouteRepository,
    private dispatcher: EventDispatcher
  ) {}

  async execute(input: RequestRoutesInput): Promise<Route> {
    const {
      routeId,
      jobId,
      correlationId,
      version,
      origin,
      destination,
      distanceKm,
      roundTrip,
      circle,
      routesCount,
      preference,
    } = input;
    const route = Route.request(
      { routeId, jobId, correlationId },
      {
        version,
        jobId,
        origin,
        destination,
        distanceKm,
        roundTrip,
        circle,
        routesCount,
        preference,
        correlationId,
      }
    );
    await this.repository.save(route);
    await this.dispatcher.publishAll(route.pullEvents());
    return route;
  }
}

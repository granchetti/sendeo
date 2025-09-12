import { RouteRepository } from "../../domain/repositories/route-repository";
import { Route } from "../../domain/entities/route";
import { EventDispatcher } from "../../../shared/domain/events/event-dispatcher";
import { UUID } from "../../../shared/domain/value-objects/uuid";

export interface RequestRoutesInput {
  routeId: UUID;
  jobId: UUID;
  correlationId: UUID;
  origin: string;
  destination?: string;
  distanceKm?: number;
  routesCount?: number;
  version: number;
}

export class RequestRoutesUseCase {
  constructor(
    private repository: RouteRepository,
    private dispatcher: EventDispatcher
  ) {}

  async execute(input: RequestRoutesInput): Promise<Route> {
    const route = Route.request(input);
    await this.repository.save(route);
    await this.dispatcher.publishAll(route.pullEvents());
    return route;
  }
}

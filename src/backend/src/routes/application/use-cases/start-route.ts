import { RouteRepository } from "../../domain/repositories/route-repository";
import { EventDispatcher } from "../../../shared/domain/events/event-dispatcher";
import { UUID } from "../../../shared/domain/value-objects/uuid";
import { RouteStartedEvent } from "../../domain/events/route-started";
import { Route } from "../../domain/entities/route";
import { RouteNotFoundError } from "../../../shared/errors";

export interface StartRouteInput {
  readonly routeId: UUID;
  readonly email: string;
  readonly timestamp: number;
}

export class StartRouteUseCase {
  constructor(
    private repository: RouteRepository,
    private dispatcher: EventDispatcher
  ) {}

  async execute(input: StartRouteInput): Promise<Route> {
    const route = await this.repository.findById(input.routeId);
    if (!route) throw new RouteNotFoundError();
    route.start();
    await this.repository.save(route);
    await this.dispatcher.publishAll([
      ...route.pullEvents(),
      new RouteStartedEvent({
        route,
        email: input.email,
        timestamp: input.timestamp,
      }),
    ]);
    return route;
  }
}

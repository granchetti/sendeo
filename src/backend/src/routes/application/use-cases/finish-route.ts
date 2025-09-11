import { RouteRepository } from "../../domain/repositories/route-repository";
import { EventDispatcher } from "../../../shared/domain/events/event-dispatcher";
import { UUID } from "../../../shared/domain/value-objects/uuid";
import { RouteFinishedEvent } from "../../domain/events/route-finished";
import { Route } from "../../domain/entities/route";
import { RouteNotFoundError } from "../../../shared/errors";

export interface FinishRouteInput {
  readonly routeId: UUID;
  readonly email: string;
  readonly timestamp: number;
  readonly actualDuration?: number;
}

export class FinishRouteUseCase {
  constructor(
    private repository: RouteRepository,
    private dispatcher: EventDispatcher
  ) {}

  async execute(input: FinishRouteInput): Promise<Route> {
    const route = await this.repository.findById(input.routeId);
    if (!route) throw new RouteNotFoundError();
    route.finish();
    await this.repository.save(route);
    await this.dispatcher.publishAll([
      ...route.pullEvents(),
      new RouteFinishedEvent({
        route,
        email: input.email,
        timestamp: input.timestamp,
        actualDuration: input.actualDuration,
      }),
    ]);
    return route;
  }
}

import { RouteRepository } from "../../domain/repositories/route-repository";
import { Route, RouteProps } from "../../domain/entities/route-entity";
import { InMemoryEventDispatcher } from "../../../shared/domain/events/event-dispatcher";

export interface RequestRoutesInput extends Omit<RouteProps, "status"> {}

export class RequestRoutesUseCase {
  constructor(
    private repository: RouteRepository,
    private dispatcher: InMemoryEventDispatcher
  ) {}

  async execute(input: RequestRoutesInput): Promise<Route> {
    const route = Route.request(input);
    await this.repository.save(route);
    await this.dispatcher.publishAll(route.pullEvents());
    return route;
  }
}

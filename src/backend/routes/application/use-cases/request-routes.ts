
import { Route, RouteProps } from '../../domain/entities/route-entity';
import { RouteRepository } from '../../domain/repositories/route-repository';

export interface RequestRoutesInput extends RouteProps {}

export class RequestRoutesUseCase {
  constructor(private repository: RouteRepository) {}

  async execute(input: RequestRoutesInput): Promise<Route> {
    const route = new Route(input);
    await this.repository.save(route);
    return route;
  }
}
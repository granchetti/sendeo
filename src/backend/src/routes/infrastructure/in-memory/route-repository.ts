import { Route } from '../../domain/entities/route-entity';
import { RouteRepository } from '../../domain/repositories/route-repository';

export class InMemoryRouteRepository implements RouteRepository {
  private routes = new Map<string, Route>();

  async save(route: Route): Promise<void> {
    this.routes.set(route.routeId, route);
  }

  async findById(id: string): Promise<Route | null> {
    return this.routes.get(id) ?? null;
  }
}
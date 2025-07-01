import { Route } from "../../domain/entities/route-entity";
import { RouteRepository } from "../../domain/repositories/route-repository";
import { RouteId } from "../../domain/value-objects/route-id-value-object";

export class InMemoryRouteRepository implements RouteRepository {
  private routes = new Map<string, Route>();

  async save(route: Route): Promise<void> {
    this.routes.set(route.routeId.Value, route);
  }

  async findById(id: RouteId): Promise<Route | null> {
    return this.routes.get(id.Value) ?? null;
  }

  async findAll(): Promise<Route[]> {
    return Array.from(this.routes.values());
  }
  async remove(id: RouteId): Promise<void> {
    this.routes.delete(id.Value);
  }
}

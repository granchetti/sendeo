import { Route } from "../../domain/entities/route-entity";
import { RouteRepository } from "../../domain/repositories/route-repository";
import { UUID } from "../../domain/value-objects/uuid-value-object";

export class InMemoryRouteRepository implements RouteRepository {
  private routes = new Map<string, Route>();

  async save(route: Route): Promise<void> {
    this.routes.set(route.routeId.Value, route);
  }

  async findById(id: UUID): Promise<Route | null> {
    return this.routes.get(id.Value) ?? null;
  }

  async findAll(): Promise<Route[]> {
    return Array.from(this.routes.values());
  }

  async findByJobId(jobId: string): Promise<Route[]> {
    return Array.from(this.routes.values()).filter((r) => r.jobId === jobId);
  }
  async remove(id: UUID): Promise<void> {
    this.routes.delete(id.Value);
  }
}

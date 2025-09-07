import { Route } from "../../domain/entities/route";
import { RouteRepository } from "../../domain/repositories/route-repository";
import { UUID } from "../../../shared/domain/value-objects/uuid";

export class InMemoryRouteRepository implements RouteRepository {
  private routes = new Map<string, Route>();

  async save(route: Route): Promise<void> {
    this.routes.set(route.routeId.Value, route);
  }

  async findById(id: UUID): Promise<Route | null> {
    return this.routes.get(id.Value) ?? null;
  }

  async findAll(
    params?: { cursor?: string; limit?: number }
  ): Promise<{ items: Route[]; nextCursor?: string }> {
    const all = Array.from(this.routes.values());
    let startIndex = 0;
    if (params?.cursor) {
      const idx = all.findIndex((r) => r.routeId.Value === params.cursor);
      startIndex = idx >= 0 ? idx + 1 : 0;
    }
    const limit = params?.limit ?? all.length;
    const items = all.slice(startIndex, startIndex + limit);
    const nextIndex = startIndex + limit;
    const nextCursor =
      nextIndex < all.length && items.length > 0
        ? items[items.length - 1].routeId.Value
        : undefined;
    return nextCursor ? { items, nextCursor } : { items };
  }

  async findByJobId(jobId: UUID): Promise<Route[]> {
    return Array.from(this.routes.values()).filter((r) => r.jobId?.equals(jobId));
  }
  
  async remove(id: UUID): Promise<void> {
    this.routes.delete(id.Value);
  }
}

import { RouteRepository } from "../../domain/repositories/route-repository";
import { Route } from "../../domain/entities/route-entity";
import { UUID } from "../../../shared/domain/value-objects/uuid-value-object";
import { MapProvider } from "../../domain/services/map-provider";
import { describeRoute } from "../../handlers/describe-route";

export class DescribeRouteUseCase {
  constructor(private repository: RouteRepository) {}

  async execute(id: UUID, mapProvider: MapProvider): Promise<Route | null> {
    const route = await this.repository.findById(id);
    if (!route) return null;

    if (!route.description && route.path) {
      try {
        const desc = await describeRoute(route.path.Encoded, mapProvider);
        if (desc) {
          route.description = desc;
          await this.repository.save(route);
        }
      } catch (err) {
        console.warn("describeRoute failed:", err);
      }
    }

    return route;
  }
}

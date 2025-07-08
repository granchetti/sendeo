import { Route } from "../entities/route-entity";
import { RouteId } from "../value-objects/route-id-value-object";

export interface RouteRepository {
  save(route: Route): Promise<void>;
  findById(id: RouteId): Promise<Route | null>;
  findAll(): Promise<Route[]>;
  findByJobId(jobId: string): Promise<Route[]>;
  remove(id: RouteId): Promise<void>;
}

import { Route } from "../entities/route-entity";
import { UUID } from "../value-objects/uuid-value-object";

export interface RouteRepository {
  save(route: Route): Promise<void>;
  findById(id: UUID): Promise<Route | null>;
  findAll(): Promise<Route[]>;
  findByJobId(jobId: string): Promise<Route[]>;
  remove(id: UUID): Promise<void>;
}

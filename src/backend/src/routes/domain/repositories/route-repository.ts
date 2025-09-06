import { Route } from "../entities/route-entity";
import { UUID } from "../../../shared/domain/value-objects/uuid-value-object";

export interface RouteRepository {
  save(route: Route): Promise<void>;
  findById(id: UUID): Promise<Route | null>;
  findAll(): Promise<Route[]>;
  findByJobId(jobId: UUID): Promise<Route[]>;
  remove(id: UUID): Promise<void>;
}

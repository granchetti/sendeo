import { Route } from "../entities/route";
import { UUID } from "../../../shared/domain/value-objects/uuid";

export interface RouteRepository {
  save(route: Route): Promise<void>;
  findById(id: UUID): Promise<Route | null>;
  findAll(
    params?: { cursor?: string; limit?: number }
  ): Promise<{ items: Route[]; nextCursor?: string }>;
  findByJobId(jobId: UUID): Promise<Route[]>;
  remove(id: UUID): Promise<void>;
}

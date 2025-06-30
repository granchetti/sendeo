import { Route } from "../entities/route-entity";

export interface RouteRepository {
  save(route: Route): Promise<void>;
  findById(id: string): Promise<Route | null>;
  findAll(): Promise<Route[]>;
  remove(id: string): Promise<void>;
}

import { RouteRepository } from "../../domain/repositories/route-repository";
import { Route } from "../../domain/entities/route";

export class ListRoutesUseCase {
  constructor(private repository: RouteRepository) {}

  async execute(
    params?: { cursor?: string; limit?: number }
  ): Promise<{ items: Route[]; nextCursor?: string }> {
    return this.repository.findAll(params);
  }
}

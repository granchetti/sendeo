import { RouteRepository } from '../../domain/repositories/route-repository';
import { Route } from '../../domain/entities/route-entity';
import { RouteId } from '../../domain/value-objects/route-id-value-object';

export class GetRouteDetailsUseCase {
  constructor(private repository: RouteRepository) {}

  async execute(id: RouteId): Promise<Route | null> {
    return this.repository.findById(id);
  }
}

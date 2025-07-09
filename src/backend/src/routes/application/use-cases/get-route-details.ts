import { RouteRepository } from '../../domain/repositories/route-repository';
import { Route } from '../../domain/entities/route-entity';
import { UUID } from '../../domain/value-objects/uuid-value-object';

export class GetRouteDetailsUseCase {
  constructor(private repository: RouteRepository) {}

  async execute(id: UUID): Promise<Route | null> {
    return this.repository.findById(id);
  }
}

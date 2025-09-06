import { RouteRepository } from '../../domain/repositories/route-repository';
import { Route } from '../../domain/entities/route';
import { UUID } from '../../../shared/domain/value-objects/uuid';

export class GetRouteDetailsUseCase {
  constructor(private repository: RouteRepository) {}

  async execute(id: UUID): Promise<Route | null> {
    return this.repository.findById(id);
  }
}

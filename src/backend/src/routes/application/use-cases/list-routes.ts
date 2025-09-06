import { RouteRepository } from '../../domain/repositories/route-repository';
import { Route } from '../../domain/entities/route';

export class ListRoutesUseCase {
  constructor(private repository: RouteRepository) {}

  async execute(): Promise<Route[]> {
    return this.repository.findAll();
  }
}

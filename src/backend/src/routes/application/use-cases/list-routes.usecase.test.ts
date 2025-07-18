import { ListRoutesUseCase } from './list-routes';
import { RouteRepository } from '../../domain/repositories/route-repository';
import { Route } from '../../domain/entities/route-entity';
import { UUID } from '../../domain/value-objects/uuid-value-object';

describe('ListRoutesUseCase', () => {
  it('returns all routes from repository', async () => {
    const routes = [new Route({ routeId: UUID.generate() })];
    const repo: RouteRepository = {
      findAll: jest.fn().mockResolvedValue(routes),
      findById: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    } as any;
    const useCase = new ListRoutesUseCase(repo);
    const result = await useCase.execute();
    expect(repo.findAll).toHaveBeenCalled();
    expect(result).toBe(routes);
  });
});

import { GetRouteDetailsUseCase } from './get-route-details';
import { RouteRepository } from '../../domain/repositories/route-repository';
import { Route } from '../../domain/entities/route-entity';
import { UUID } from '../../../shared/domain/value-objects/uuid-value-object';

describe('GetRouteDetailsUseCase', () => {
  it('retrieves route from repository', async () => {
    const route = Route.request({ routeId: UUID.generate() });
    const repo: RouteRepository = {
      findById: jest.fn().mockResolvedValue(route),
      findAll: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    } as any;
    const useCase = new GetRouteDetailsUseCase(repo);
    const result = await useCase.execute(route.routeId);
    expect(repo.findById).toHaveBeenCalledWith(route.routeId);
    expect(result).toBe(route);
  });
});

import { GetRouteDetailsUseCase } from './get-route-details';
import { RouteRepository } from '../../domain/repositories/route-repository';
import { Route } from '../../domain/entities/route';
import { UUID } from '../../../shared/domain/value-objects/uuid';

describe('GetRouteDetailsUseCase', () => {
  it('retrieves route from repository', async () => {
    const route = Route.request({ routeId: UUID.generate() });
    const repo: RouteRepository = {
      findById: jest.fn().mockResolvedValue(route),
      findAll: jest.fn().mockResolvedValue({ items: [] }),
      findByJobId: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    } as any;
    const useCase = new GetRouteDetailsUseCase(repo);
    const result = await useCase.execute(route.routeId);
    expect(repo.findById).toHaveBeenCalledWith(route.routeId);
    expect(result).toBe(route);
  });
});

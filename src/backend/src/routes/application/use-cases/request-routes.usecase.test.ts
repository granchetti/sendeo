import { RequestRoutesUseCase } from './request-routes';
import { RouteRepository } from '../../domain/repositories/route-repository';
import { Route } from '../../domain/entities/route-entity';
import { RouteId } from '../../domain/value-objects/route-id-value-object';

describe('RequestRoutesUseCase', () => {
  it('saves and returns a Route instance', async () => {
    const save = jest.fn();
    const repo: RouteRepository = { save } as any;
    const useCase = new RequestRoutesUseCase(repo);
    const routeId = RouteId.generate();

    const result = await useCase.execute({ routeId });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(expect.any(Route));
    expect(result.routeId.equals(routeId)).toBe(true);
  });
});

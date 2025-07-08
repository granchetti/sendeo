import { RequestRoutesUseCase } from './request-routes';
import { RouteRepository } from '../../domain/repositories/route-repository';
import { Route } from '../../domain/entities/route-entity';
import { UUID } from '../../domain/value-objects/uuid-value-object';

describe('RequestRoutesUseCase', () => {
  it('saves and returns a Route instance', async () => {
    const save = jest.fn();
    const repo: RouteRepository = { save } as any;
    const useCase = new RequestRoutesUseCase(repo);
    const routeId = UUID.generate();

    const result = await useCase.execute({ routeId });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(expect.any(Route));
    expect(result.routeId.equals(routeId)).toBe(true);
  });
});

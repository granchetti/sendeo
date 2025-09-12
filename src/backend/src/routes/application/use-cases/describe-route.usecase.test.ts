import { DescribeRouteUseCase } from './describe-route';
import { RouteRepository } from '../../domain/repositories/route-repository';
import { Route } from '../../domain/entities/route';
import { UUID } from '../../../shared/domain/value-objects/uuid';
import { Path } from '../../domain/value-objects/path';
import { LatLng } from '../../domain/value-objects/lat-lng';
import { RouteStatus } from '../../domain/value-objects/route-status';
import { RouteDescriptionService } from '../../domain/services/route-description-service';

describe('DescribeRouteUseCase', () => {
  it('generates and saves description when missing', async () => {
    const routeId = UUID.generate();
    const path = Path.fromCoordinates([
      LatLng.fromNumbers(0, 0),
      LatLng.fromNumbers(1, 1),
    ]);
    const route = Route.rehydrate({ routeId, path, status: RouteStatus.Generated });
    const repo: RouteRepository = {
      findById: jest.fn().mockResolvedValue(route),
      save: jest.fn(),
      findAll: jest.fn().mockResolvedValue({ items: [] }),
      findByJobId: jest.fn(),
      remove: jest.fn(),
    } as any;
    const service: RouteDescriptionService = {
      describe: jest.fn().mockResolvedValue('generated description'),
    };
    const useCase = new DescribeRouteUseCase(repo, service);

    const result = await useCase.execute(routeId);

    expect(repo.findById).toHaveBeenCalledWith(routeId);
    expect(result).toBe(route);
    expect(result?.description).toBe('generated description');
    expect(repo.save).toHaveBeenCalledWith(route);
    expect(service.describe).toHaveBeenCalledWith(path.Encoded);
  });
});

import { DescribeRouteUseCase } from './describe-route';
import { RouteRepository } from '../../domain/repositories/route-repository';
import { Route } from '../../domain/entities/route-entity';
import { UUID } from '../../../shared/domain/value-objects/uuid-value-object';
import { MapProvider } from '../../domain/services/map-provider';
import { Path } from '../../domain/value-objects/path-value-object';
import { LatLng } from '../../domain/value-objects/lat-lng-value-object';
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
      findAll: jest.fn(),
      findByJobId: jest.fn(),
      remove: jest.fn(),
    } as any;
    const mapProvider: MapProvider = {
      getCityName: jest.fn().mockResolvedValue('City'),
    };
    const service: RouteDescriptionService = {
      describe: jest.fn().mockResolvedValue('generated description'),
    };
    const useCase = new DescribeRouteUseCase(repo, service);

    const result = await useCase.execute(routeId, mapProvider);

    expect(repo.findById).toHaveBeenCalledWith(routeId);
    expect(result).toBe(route);
    expect(result?.description).toBe('generated description');
    expect(repo.save).toHaveBeenCalledWith(route);
    expect(service.describe).toHaveBeenCalledWith(path.Encoded, mapProvider);
  });
});

import { InMemoryRouteRepository } from './in-memory-route-repository';
import { Route } from '../../domain/entities/route-entity';
import { RouteId } from '../../domain/value-objects/route-id-value-object';
import { DistanceKm } from '../../domain/value-objects/distance-value-object';
import { Duration } from '../../domain/value-objects/duration-value-object';
import { Path } from '../../domain/value-objects/path-value-object';

describe('InMemoryRouteRepository', () => {
  let repo: InMemoryRouteRepository;

  beforeEach(() => {
    repo = new InMemoryRouteRepository();
  });

  it('saves and retrieves a route by id', async () => {
    const route = new Route({
      routeId: RouteId.generate(),
      distanceKm: new DistanceKm(3),
      duration: new Duration(300),
      path: Path.fromCoordinates([
        { lat: 0, lng: 0 },
        { lat: 1, lng: 1 },
      ]),
    });

    await repo.save(route);
    const fetched = await repo.findById(route.routeId);

    expect(fetched).not.toBeNull();
    expect(fetched?.routeId.equals(route.routeId)).toBe(true);
    expect(fetched?.distanceKm?.Value).toBe(3);
    expect(fetched?.duration?.Value).toBe(300);
    expect(fetched?.path?.Coordinates).toEqual(route.path!.Coordinates);
  });

  it('returns null when finding non-existent id', async () => {
    const missing = await repo.findById(RouteId.generate());
    expect(missing).toBeNull();
  });

  it('findAll returns all saved routes', async () => {
    const routeA = new Route({
      routeId: RouteId.generate(),
      distanceKm: new DistanceKm(1),
      duration: new Duration(100),
      path: Path.fromCoordinates([
        { lat: 10, lng: 10 },
        { lat: 20, lng: 20 },
      ]),
    });
    const routeB = new Route({
      routeId: RouteId.generate(),
      distanceKm: new DistanceKm(2),
      duration: new Duration(200),
      path: Path.fromCoordinates([
        { lat: 30, lng: 30 },
        { lat: 40, lng: 40 },
      ]),
    });

    await repo.save(routeA);
    await repo.save(routeB);

    const all = await repo.findAll();
    expect(all).toHaveLength(2);
    expect(all.map(r => r.routeId.Value)).toEqual(
      expect.arrayContaining([routeA.routeId.Value, routeB.routeId.Value])
    );
  });

  it('remove deletes the route', async () => {
    const route = new Route({
      routeId: RouteId.generate(),
      distanceKm: new DistanceKm(5),
      duration: new Duration(500),
      path: Path.fromCoordinates([
        { lat: 50, lng: 50 },
        { lat: 60, lng: 60 },
      ]),
    });

    await repo.save(route);
    expect(await repo.findById(route.routeId)).not.toBeNull();

    await repo.remove(route.routeId);
    expect(await repo.findById(route.routeId)).toBeNull();
  });
});

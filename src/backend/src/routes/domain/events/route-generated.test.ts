import { RouteGeneratedEvent } from './route-generated';
import { Route } from '../entities/route-entity';
import { UUID } from '../../../shared/domain/value-objects/uuid-value-object';
import { DistanceKm } from '../value-objects/distance-value-object';
import { Duration } from '../value-objects/duration-value-object';
import { Path } from '../value-objects/path-value-object';
import { LatLng } from '../value-objects/lat-lng-value-object';

describe('RouteGeneratedEvent', () => {
  it('should hold the generated route', () => {
    const route = new Route({
      routeId: UUID.generate(),
      distanceKm: new DistanceKm(1),
      duration: new Duration(60),
      path: Path.fromCoordinates([
        LatLng.fromNumbers(0, 0),
        LatLng.fromNumbers(1, 1),
      ]),
    });
    const event = new RouteGeneratedEvent({ route });
    expect(event.route).toBe(route);
  });
});
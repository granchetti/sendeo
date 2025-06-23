import { RouteGeneratedEvent } from './route-generated';
import { Route } from '../entities/route-entity';
import { RouteId } from '../value-objects/route-id-value-object';
import { DistanceKm } from '../value-objects/distance-value-object';
import { Duration } from '../value-objects/duration-value-object';
import { Path } from '../value-objects/path-value-object';

describe('RouteGeneratedEvent', () => {
  it('should hold the generated route', () => {
    const route = new Route({
      routeId: RouteId.generate(),
      distanceKm: new DistanceKm(1),
      duration: new Duration(60),
      path: new Path([
        { lat: 0, lng: 0 },
        { lat: 1, lng: 1 },
      ]),
    });
    const event = new RouteGeneratedEvent({ route });
    expect(event.route).toBe(route);
  });
});
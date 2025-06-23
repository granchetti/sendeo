import { RequestRoutesEvent } from './request-routes';
import { RouteId } from '../value-objects/route-id-value-object';

describe('RequestRoutesEvent', () => {
  it('should store provided properties', () => {
    const routeId = RouteId.generate();
    const event = new RequestRoutesEvent({
      routeId,
      origin: 'A',
      destination: 'B',
    });
    expect(event.routeId).toBe(routeId);
    expect(event.origin).toBe('A');
    expect(event.destination).toBe('B');
  });
});
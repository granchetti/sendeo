import { RequestRoutesEvent } from './request-routes';
import { UUID } from '../value-objects/uuid-value-object';
import { Address } from '../value-objects/address-value-object';

describe('RequestRoutesEvent', () => {
  it('should store provided properties', () => {
    const routeId = UUID.generate();
    const event = new RequestRoutesEvent({
      routeId,
      origin: new Address('A'),
      destination: new Address('B'),
    });
    expect(event.routeId).toBe(routeId);
    expect(event.origin.Value).toBe('A');
    expect(event.destination.Value).toBe('B');
  });
});
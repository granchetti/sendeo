import { UserProfile } from './user-profile';
import { Email } from '../value-objects/email-value-object';
import { Age } from '../value-objects/age-value-object';
import { DistanceUnit } from '../value-objects/distance-unit-value-object';

describe('UserProfile', () => {
  it('converts to and from primitives', () => {
    const profile = UserProfile.fromPrimitives({
      email: 'a@b.com',
      firstName: 'A',
      lastName: 'B',
      displayName: 'AB',
      age: 20,
      unit: 'km',
    });
    const roundtrip = UserProfile.fromPrimitives(profile.toPrimitives());
    expect(roundtrip.email.Value).toBe('a@b.com');
    expect(roundtrip.firstName).toBe('A');
    expect(roundtrip.age?.Value).toBe(20);
    expect(roundtrip.unit?.Value).toBe('km');
  });
});

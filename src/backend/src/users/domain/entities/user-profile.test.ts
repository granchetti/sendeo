import { UserProfile } from './user-profile';

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

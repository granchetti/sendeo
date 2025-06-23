import { RouteId } from './route-id-value-object';

describe('RouteId', () => {
  it('should create a valid RouteId with a generated UUID v4', () => {
    const id = RouteId.generate();
    expect(id.Value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it('should create a RouteId from a string if it is a valid UUID v4', () => {
    const validUuid = '3d594650-3436-4d75-b3b5-3eac993e90b8';
    const id = RouteId.fromString(validUuid);
    expect(id.Value).toBe(validUuid);
  });

  it('should throw an error if the string is not a valid UUID v4', () => {
    expect(() => RouteId.fromString('not-a-uuid')).toThrow();
    expect(() => RouteId.fromString('12345678-1234-1234-1234-123456789012')).toThrow();
  });

  it('equals should work correctly', () => {
    const uuid = '3d594650-3436-4d75-b3b5-3eac993e90b8';
    const id1 = RouteId.fromString(uuid);
    const id2 = RouteId.fromString(uuid);
    const id3 = RouteId.generate();
    expect(id1.equals(id2)).toBe(true);
    expect(id1.equals(id3)).toBe(false);
  });
});

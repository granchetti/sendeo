import { UUID } from './uuid';

describe('UUID', () => {
  it('should create a valid UUID with a generated UUID v4', () => {
    const id = UUID.generate();
    expect(id.Value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it('should create a UUID from a string if it is a valid UUID v4', () => {
    const validUuid = '3d594650-3436-4d75-b3b5-3eac993e90b8';
    const id = UUID.fromString(validUuid);
    expect(id.Value).toBe(validUuid);
  });

  it('should throw an error if the string is not a valid UUID v4', () => {
    expect(() => UUID.fromString('not-a-uuid')).toThrow();
    expect(() => UUID.fromString('12345678-1234-1234-1234-123456789012')).toThrow();
  });

  it('equals should work correctly', () => {
    const uuid = '3d594650-3436-4d75-b3b5-3eac993e90b8';
    const id1 = UUID.fromString(uuid);
    const id2 = UUID.fromString(uuid);
    const id3 = UUID.generate();
    expect(id1.equals(id2)).toBe(true);
    expect(id1.equals(id3)).toBe(false);
  });
});

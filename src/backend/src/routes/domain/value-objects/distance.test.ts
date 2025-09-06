import { DistanceKm } from './distance';

describe('DistanceKm', () => {
  it('should create a valid distance', () => {
    const d = new DistanceKm(5.2);
    expect(d.Value).toBe(5.2);
  });

  it('should throw an error for negative values', () => {
    expect(() => new DistanceKm(-1)).toThrow('Distance cannot be negative');
  });

  it('should allow a distance of 0', () => {
    const d = new DistanceKm(0);
    expect(d.Value).toBe(0);
  });
});

import { DistanceUnit } from './distance-unit';

describe('DistanceUnit', () => {
  it('creates from valid unit', () => {
    expect(DistanceUnit.fromString('km').Value).toBe('km');
    expect(DistanceUnit.fromString('mi').Value).toBe('mi');
  });

  it('throws for invalid unit', () => {
    expect(() => DistanceUnit.fromString('m')).toThrow('Invalid distance unit');
  });
});

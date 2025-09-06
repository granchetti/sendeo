import { LatLng } from './lat-lng';

describe('LatLng', () => {
  it('creates valid coordinates', () => {
    const ll = LatLng.fromNumbers(45, -73);
    expect(ll.Lat).toBe(45);
    expect(ll.Lng).toBe(-73);
  });

  it('allows boundary values', () => {
    const ll = LatLng.fromNumbers(-90, 180);
    expect(ll.Lat).toBe(-90);
    expect(ll.Lng).toBe(180);
  });

  it('rejects invalid latitude', () => {
    expect(() => LatLng.fromNumbers(91, 0)).toThrow('Latitude must be between -90 and 90');
    expect(() => LatLng.fromNumbers(-91, 0)).toThrow('Latitude must be between -90 and 90');
  });

  it('rejects invalid longitude', () => {
    expect(() => LatLng.fromNumbers(0, 181)).toThrow('Longitude must be between -180 and 180');
    expect(() => LatLng.fromNumbers(0, -181)).toThrow('Longitude must be between -180 and 180');
  });
});

import { Path, LatLng } from './path-value-object';

describe('Path', () => {
  const coords: LatLng[] = [
    { lat: 41.38, lng: 2.17 },
    { lat: 41.39, lng: 2.18 },
  ];

  describe('fromCoordinates()', () => {
    it('should create a valid Path with at least two points', () => {
      const path = Path.fromCoordinates(coords);
      expect(path.Coordinates.length).toBe(2);
    });

    it('should throw an error if the array is empty', () => {
      expect(() => Path.fromCoordinates([])).toThrow(
        'The path must have at least two coordinates'
      );
    });

    it('should throw an error if the array has only one point', () => {
      expect(() => Path.fromCoordinates([{ lat: 41.38, lng: 2.17 }])).toThrow(
        'The path must have at least two coordinates'
      );
    });

    it('Coordinates should return a copy of the array', () => {
      const original = [...coords];
      const path = Path.fromCoordinates(original);
      const c1 = path.Coordinates;
      const c2 = path.Coordinates;
      expect(c1).not.toBe(original);    
      expect(c1).toEqual(original);    
      expect(c1).not.toBe(c2);          
    });
  });

  describe('constructor(encoded)', () => {
    it('should throw if the encoded string is empty', () => {
      expect(() => new Path('')).toThrow(
        'Encoded polyline string is required'
      );
    });

    it('should decode correctly back to the same coords', () => {
      const path = Path.fromCoordinates(coords);
      const roundtrip = new Path(path.Encoded);
      expect(roundtrip.Coordinates).toEqual(coords);
    });
  });
});

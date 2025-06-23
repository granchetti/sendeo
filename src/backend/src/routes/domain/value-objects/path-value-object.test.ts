import { Path } from './path-value-object';

describe('Path', () => {
  it('should create a valid Path with at least two points', () => {
    const path = new Path([
      { lat: 41.38, lng: 2.17 },
      { lat: 41.39, lng: 2.18 },
    ]);
    expect(path.Coordinates.length).toBe(2);
  });

  it('should throw an error if the array is empty', () => {
    expect(() => new Path([])).toThrow('The path must have at least two coordinates');
  });

  it('should throw an error if the array has only one point', () => {
    expect(() => new Path([{ lat: 41.38, lng: 2.17 }])).toThrow(
      'The path must have at least two coordinates'
    );
  });

  it('Coordinates should return a copy of the array', () => {
    const coords = [
      { lat: 41.38, lng: 2.17 },
      { lat: 41.39, lng: 2.18 },
    ];
    const path = new Path(coords);
    expect(path.Coordinates).not.toBe(coords); // not the same reference
    expect(path.Coordinates).toEqual(coords);
  });
});

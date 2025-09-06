import { Duration } from './duration';

describe('Duration', () => {
  it('should create a valid duration', () => {
    const d = new Duration(100);
    expect(d.Value).toBe(100);
  });

  it('should throw an error for negative durations', () => {
    expect(() => new Duration(-10)).toThrow('Duration cannot be negative');
  });

  it('should allow a duration of 0', () => {
    const d = new Duration(0);
    expect(d.Value).toBe(0);
  });
});

import { Age } from './age';

describe('Age', () => {
  it('creates from valid number', () => {
    expect(Age.fromNumber(30).Value).toBe(30);
  });

  it('throws for negative', () => {
    expect(() => Age.fromNumber(-1)).toThrow('Invalid age');
  });

  it('throws for too high', () => {
    expect(() => Age.fromNumber(200)).toThrow('Invalid age');
  });
});

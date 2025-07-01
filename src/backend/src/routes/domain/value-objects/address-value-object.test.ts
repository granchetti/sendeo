import { Address } from './address-value-object';

describe('Address', () => {
  it('should create a valid address', () => {
    const addr = new Address('123 Main St');
    expect(addr.Value).toBe('123 Main St');
  });

  it('should throw an error for empty string', () => {
    expect(() => new Address('')).toThrow('Address cannot be empty');
  });

  it('should throw an error for whitespace string', () => {
    expect(() => new Address('   ')).toThrow('Address cannot be empty');
  });
});

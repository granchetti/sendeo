import { Email } from './email';

describe('Email', () => {
  it('creates from valid string', () => {
    const e = Email.fromString('user@example.com');
    expect(e.Value).toBe('user@example.com');
  });

  it('throws on invalid email', () => {
    expect(() => Email.fromString('bad')).toThrow('Invalid email address');
  });
});

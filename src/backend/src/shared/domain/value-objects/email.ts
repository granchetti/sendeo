import { ValidationError } from "../../errors";

export class Email {
  private constructor(private readonly value: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new ValidationError('Invalid email address');
    }
  }

  static fromString(value: string): Email {
    return new Email(value);
  }

  get Value(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}

import { ValidationError } from "../../../shared/errors";

export class Age {
  private constructor(private readonly value: number) {
    if (!Number.isInteger(value) || value < 0 || value > 120) {
      throw new ValidationError('Invalid age');
    }
  }

  static fromNumber(value: number): Age {
    return new Age(value);
  }

  get Value(): number {
    return this.value;
  }
}

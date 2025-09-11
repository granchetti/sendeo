import { ValidationError } from "../../../shared/errors";

export class Duration {
  private readonly value: number;

  constructor(value: number) {
    if (value < 0) throw new ValidationError("Duration cannot be negative");
    this.value = value;
  }

  get Value(): number {
    return this.value;
  }
}

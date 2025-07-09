export class Age {
  private constructor(private readonly value: number) {
    if (!Number.isInteger(value) || value < 0 || value > 120) {
      throw new Error('Invalid age');
    }
  }

  static fromNumber(value: number): Age {
    return new Age(value);
  }

  get Value(): number {
    return this.value;
  }
}

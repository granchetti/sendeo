export class Duration {
  private readonly value: number;

  constructor(value: number) {
    if (value < 0) throw new Error("Duration cannot be negative");
    this.value = value;
  }

  get Value(): number {
    return this.value;
  }
}

export class DistanceKm {
  private readonly value: number;

  constructor(value: number) {
    if (value < 0) throw new Error("Distance cannot be negative");
    this.value = value;
  }

  get Value(): number {
    return this.value;
  }
}
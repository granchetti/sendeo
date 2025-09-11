import { InvalidDistanceError } from "../../../shared/errors";

export class DistanceKm {
  private readonly value: number;

  constructor(value: number) {
    if (value < 0) throw new InvalidDistanceError();
    this.value = value;
  }

  get Value(): number {
    return this.value;
  }
}
export type DistanceUnitType = 'km' | 'mi';

export class DistanceUnit {
  private constructor(private readonly value: DistanceUnitType) {}

  static fromString(value: string): DistanceUnit {
    if (value !== 'km' && value !== 'mi') {
      throw new Error('Invalid distance unit');
    }
    return new DistanceUnit(value as DistanceUnitType);
  }

  get Value(): DistanceUnitType {
    return this.value;
  }
}

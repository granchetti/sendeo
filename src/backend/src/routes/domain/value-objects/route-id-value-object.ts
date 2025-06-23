import { v4 as uuidv4, validate as uuidValidate, version as uuidVersion } from 'uuid';

export class RouteId {
  private readonly value: string;

  private constructor(value: string) {
    if (!uuidValidate(value) || uuidVersion(value) !== 4) {
      throw new Error('RouteId debe ser un UUID v4 válido');
    }
    this.value = value;
  }

  static fromString(value: string): RouteId {
    return new RouteId(value);
  }

  static generate(): RouteId {
    return new RouteId(uuidv4());
  }

  get Value(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  equals(other: RouteId): boolean {
    return other && this.value === other.value;
  }
}

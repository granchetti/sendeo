import { v4 as uuidv4, validate as uuidValidate, version as uuidVersion } from 'uuid';

export class UUID {
  private readonly value: string;

  private constructor(value: string) {
    if (!uuidValidate(value) || uuidVersion(value) !== 4) {
      throw new Error('UUID debe ser un UUID v4 válido');
    }
    this.value = value;
  }

  static fromString(value: string): UUID {
    return new UUID(value);
  }

  static generate(): UUID {
    return new UUID(uuidv4());
  }

  get Value(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  equals(other: UUID): boolean {
    return other && this.value === other.value;
  }
}

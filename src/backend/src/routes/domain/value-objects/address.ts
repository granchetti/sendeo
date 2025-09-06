export class Address {
  private readonly value: string;

  constructor(value: string) {
    if (!value || value.trim() === '') {
      throw new Error('Address cannot be empty');
    }
    this.value = value;
  }

  get Value(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}

export abstract class DomainEvent {
  readonly occurredAt: Date;
  abstract readonly eventName: string;

  protected constructor() {
    this.occurredAt = new Date();
  }
}

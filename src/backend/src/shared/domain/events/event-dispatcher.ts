import { DomainEvent } from "./domain-event";

export type EventHandler<T extends DomainEvent = DomainEvent> = (
  event: T
) => void | Promise<void>;

export interface EventDispatcher {
  subscribe<T extends DomainEvent>(
    eventName: string,
    handler: EventHandler<T>
  ): void;
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
}

export class InMemoryEventDispatcher implements EventDispatcher {
  private handlers: { [eventName: string]: EventHandler[] } = {};

  subscribe<T extends DomainEvent>(
    eventName: string,
    handler: EventHandler<T>
  ): void {
    if (!this.handlers[eventName]) {
      this.handlers[eventName] = [];
    }
    this.handlers[eventName].push(handler as EventHandler);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers[event.eventName] || [];
    for (const handler of handlers) {
      await handler(event);
    }
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}

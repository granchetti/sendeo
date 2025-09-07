import { DomainEvent } from "../../../shared/domain/events/domain-event";

export interface CacheExpiredProps {
  readonly count: number;
}

export class CacheExpiredEvent extends DomainEvent {
  readonly eventName = "CacheExpired";
  readonly count: number;

  constructor(props: CacheExpiredProps) {
    super();
    this.count = props.count;
  }
}

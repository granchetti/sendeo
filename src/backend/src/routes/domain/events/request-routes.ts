import { UUID } from '../../../shared/domain/value-objects/uuid-value-object';
import { Address } from '../value-objects/address-value-object';

export interface RequestRoutesProps {
  readonly routeId: UUID;
  readonly origin: Address;
  readonly destination: Address;
}

export class RequestRoutesEvent {
  readonly routeId: UUID;
  readonly origin: Address;
  readonly destination: Address;

  constructor(props: RequestRoutesProps) {
    this.routeId = props.routeId;
    this.origin = props.origin;
    this.destination = props.destination;
  }
}
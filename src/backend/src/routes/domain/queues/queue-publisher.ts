export interface QueuePublisher {
  send(message: string): Promise<void>;
}

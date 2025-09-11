import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { QueuePublisher } from "../domain/queues/queue-publisher";

export class SQSQueuePublisher implements QueuePublisher {
  constructor(private sqs: SQSClient, private queueUrl: string) {}

  async send(message: string): Promise<void> {
    await this.sqs.send(
      new SendMessageCommand({ QueueUrl: this.queueUrl, MessageBody: message })
    );
  }
}


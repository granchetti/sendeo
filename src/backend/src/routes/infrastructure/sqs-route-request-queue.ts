import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { RouteRequestQueue } from "../domain/queues/route-request-queue";

export class SQSRouteRequestQueue implements RouteRequestQueue {
  constructor(private sqs: SQSClient, private queueUrl: string) {}

  async send(message: string): Promise<void> {
    await this.sqs.send(
      new SendMessageCommand({ QueueUrl: this.queueUrl, MessageBody: message })
    );
  }
}

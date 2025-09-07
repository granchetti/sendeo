import { DynamoDBClient, ScanCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { InMemoryEventDispatcher } from "../../../shared/domain/events/event-dispatcher";
import { CacheExpiredEvent } from "../../domain/events/cache-expired";

const dynamo = new DynamoDBClient({
  endpoint: process.env.AWS_ENDPOINT_URL_DYNAMODB,
});
const cw = new CloudWatchClient({});
const sqs = new SQSClient({});

const dispatcher = new InMemoryEventDispatcher();

dispatcher.subscribe("CacheExpired", async (event: CacheExpiredEvent) => {
  const timestamp = event.occurredAt;
  if (process.env.METRICS_QUEUE) {
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: process.env.METRICS_QUEUE!,
        MessageBody: JSON.stringify({
          event: "CacheExpired",
          count: event.count,
          timestamp: timestamp.toISOString(),
        }),
      })
    );
  }
  await cw.send(
    new PutMetricDataCommand({
      Namespace: process.env.METRICS_NAMESPACE!,
      MetricData: [
        {
          MetricName: "CacheExpired",
          Value: event.count,
          Unit: "Count",
          Timestamp: timestamp,
        },
      ],
    })
  );
});

export const handler = async () => {
  const table = process.env.ROUTES_TABLE!;
  const now = Math.floor(Date.now() / 1000);
  const res = await dynamo.send(
    new ScanCommand({
      TableName: table,
      FilterExpression: "ttl <= :now",
      ExpressionAttributeValues: { ":now": { N: now.toString() } },
      ProjectionExpression: "routeId",
    })
  );
  const items = res.Items || [];
  for (const item of items) {
    const routeId = item.routeId?.S;
    if (!routeId) continue;
    try {
      await dynamo.send(
        new DeleteItemCommand({
          TableName: table,
          Key: { routeId: { S: routeId } },
        })
      );
    } catch (err) {
      console.error("[cache-cleaner] error deleting", routeId, err);
    }
  }
  if (items.length) {
    await dispatcher.publish(new CacheExpiredEvent({ count: items.length }));
  }
};

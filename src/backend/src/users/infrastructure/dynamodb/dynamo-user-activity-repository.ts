import {
  DynamoDBClient,
  PutItemCommand,
  DeleteItemCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";
import {
  ActiveRoute,
  UserActivityRepository,
} from "../../domain/repositories/user-activity-repository";

export class DynamoUserActivityRepository implements UserActivityRepository {
  constructor(private client: DynamoDBClient, private tableName: string) {}

  async putActiveRoute(
    email: string,
    routeId: string,
    startedAt: number,
    checkpointIndex?: number,
    finishedAt?: number
  ): Promise<void> {
    const item: any = {
      PK: { S: `USER#${email}` },
      SK: { S: `ACTIVE_ROUTE#${routeId}` },
      startedAt: { N: startedAt.toString() },
    };
    if (checkpointIndex != null)
      item.checkpointIndex = { N: checkpointIndex.toString() };
    if (finishedAt != null) item.finishedAt = { N: finishedAt.toString() };

    const ttlEnv = process.env.ACTIVE_ROUTE_TTL;
    if (ttlEnv) {
      const ttlSeconds = parseInt(ttlEnv, 10);
      if (!isNaN(ttlSeconds)) {
        item.ttl = {
          N: (Math.floor(startedAt / 1000) + ttlSeconds).toString(),
        };
      }
    }

    await this.client.send(
      new PutItemCommand({ TableName: this.tableName, Item: item })
    );
  }

  async getActiveRoute(
    email: string,
    routeId: string
  ): Promise<ActiveRoute | null> {
    const res = await this.client.send(
      new GetItemCommand({
        TableName: this.tableName,
        Key: { PK: { S: `USER#${email}` }, SK: { S: `ACTIVE_ROUTE#${routeId}` } },
      })
    );
    const item = res.Item;
    if (!item || !item.startedAt) return null;
    const result: ActiveRoute = {
      startedAt: parseInt(item.startedAt.N!, 10),
    };
    if (item.checkpointIndex)
      result.checkpointIndex = parseInt(item.checkpointIndex.N!, 10);
    if (item.finishedAt)
      result.finishedAt = parseInt(item.finishedAt.N!, 10);
    return result;
  }

  async deleteActiveRoute(email: string, routeId: string): Promise<void> {
    await this.client.send(
      new DeleteItemCommand({
        TableName: this.tableName,
        Key: { PK: { S: `USER#${email}` }, SK: { S: `ACTIVE_ROUTE#${routeId}` } },
      })
    );
  }
}

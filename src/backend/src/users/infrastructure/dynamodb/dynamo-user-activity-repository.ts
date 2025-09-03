import {
  DynamoDBClient,
  PutItemCommand,
  DeleteItemCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";
import { UserActivityRepository } from "../../domain/repositories/user-activity-repository";

export class DynamoUserActivityRepository implements UserActivityRepository {
  constructor(private client: DynamoDBClient, private tableName: string) {}

  async putRouteStart(
    email: string,
    routeId: string,
    timestamp: number
  ): Promise<void> {
    await this.client.send(
      new PutItemCommand({
        TableName: this.tableName,
        Item: {
          PK: { S: `USER#${email}` },
          SK: { S: `START#${routeId}` },
          timestamp: { N: timestamp.toString() },
        },
      })
    );
  }

  async getRouteStart(email: string, routeId: string): Promise<number | null> {
    const res = await this.client.send(
      new GetItemCommand({
        TableName: this.tableName,
        Key: { PK: { S: `USER#${email}` }, SK: { S: `START#${routeId}` } },
      })
    );
    if (!res.Item || !res.Item.timestamp) return null;
    return parseInt(res.Item.timestamp.N!, 10);
  }

  async deleteRouteStart(email: string, routeId: string): Promise<void> {
    await this.client.send(
      new DeleteItemCommand({
        TableName: this.tableName,
        Key: { PK: { S: `USER#${email}` }, SK: { S: `START#${routeId}` } },
      })
    );
  }
}

import {
  DynamoDBClient,
  PutItemCommand,
  DeleteItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { UserStateRepository } from "../../domain/repositories/user-state-repository";

export class DynamoUserStateRepository implements UserStateRepository {
  constructor(private client: DynamoDBClient, private tableName: string) {}

  async putFavourite(email: string, routeId: string): Promise<void> {
    await this.client.send(
      new PutItemCommand({
        TableName: this.tableName,
        Item: {
          PK: { S: `USER#${email}` },
          SK: { S: `FAV#${routeId}` },
        },
      })
    );
  }

  async deleteFavourite(email: string, routeId: string): Promise<void> {
    await this.client.send(
      new DeleteItemCommand({
        TableName: this.tableName,
        Key: {
          PK: { S: `USER#${email}` },
          SK: { S: `FAV#${routeId}` },
        },
      })
    );
  }

  async getFavourites(email: string): Promise<string[]> {
    const res = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": { S: email } },
      })
    );
    return (res.Items || []).map((i) => i.SK.S!);
  }
}

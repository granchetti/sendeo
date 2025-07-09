import {
  DynamoDBClient,
  PutItemCommand,
  DeleteItemCommand,
  QueryCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";
import { UserStateRepository } from "../../domain/repositories/user-state-repository";
import { UserProfile } from "../../domain/entities/user-profile";

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
        ExpressionAttributeValues: {
          ":pk": { S: `USER#${email}` },
        },
      })
    );
    return (res.Items || []).map((i) => i.SK.S!);
  }

  async getProfile(email: string): Promise<UserProfile | null> {
    const res = await this.client.send(
      new GetItemCommand({
        TableName: this.tableName,
        Key: { PK: { S: `USER#${email}` }, SK: { S: "PROFILE" } },
      })
    );
    if (!res.Item) return null;
    return {
      email: res.Item.email?.S ?? email,
      firstName: res.Item.firstName?.S,
      lastName: res.Item.lastName?.S,
      displayName: res.Item.displayName?.S,
      age: res.Item.age ? parseInt(res.Item.age.N!, 10) : undefined,
      unit: res.Item.unit?.S,
    };
  }

  async putProfile(profile: UserProfile): Promise<void> {
    const item: any = {
      PK: { S: `USER#${profile.email}` },
      SK: { S: "PROFILE" },
      email: { S: profile.email },
    };
    if (profile.firstName != null) item.firstName = { S: profile.firstName };
    if (profile.lastName != null) item.lastName = { S: profile.lastName };
    if (profile.displayName != null)
      item.displayName = { S: profile.displayName };
    if (profile.age != null) item.age = { N: profile.age.toString() };
    if (profile.unit != null) item.unit = { S: profile.unit };
    await this.client.send(
      new PutItemCommand({ TableName: this.tableName, Item: item })
    );
  }
}

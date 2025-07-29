import {
  DynamoDBClient,
  PutItemCommand,
  DeleteItemCommand,
  QueryCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";
import { UserStateRepository } from "../../domain/repositories/user-state-repository";
import { UserProfile } from "../../domain/entities/user-profile";
import { Email } from "../../../routes/domain/value-objects/email-value-object";

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
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :fav)",
        ExpressionAttributeValues: {
          ":pk": { S: `USER#${email}` },
          ":fav": { S: "FAV#" },
        },
      })
    );
    return (res.Items || []).map((i) => i.SK.S!.slice(4));
  }

  async getProfile(email: Email): Promise<UserProfile | null> {
    const res = await this.client.send(
      new GetItemCommand({
        TableName: this.tableName,
        Key: { PK: { S: `USER#${email.Value}` }, SK: { S: "PROFILE" } },
      })
    );
    if (!res.Item) return null;
    return UserProfile.fromPrimitives({
      email: res.Item.email?.S ?? email.Value,
      firstName: res.Item.firstName?.S,
      lastName: res.Item.lastName?.S,
      displayName: res.Item.displayName?.S,
      age: res.Item.age ? parseInt(res.Item.age.N!, 10) : undefined,
      unit: res.Item.unit?.S,
    });
  }

  async putProfile(profile: UserProfile): Promise<void> {
    const p = profile.toPrimitives();
    const item: any = {
      PK: { S: `USER#${p.email}` },
      SK: { S: "PROFILE" },
      email: { S: p.email },
    };
    if (p.firstName != null) item.firstName = { S: p.firstName };
    if (p.lastName != null) item.lastName = { S: p.lastName };
    if (p.displayName != null) item.displayName = { S: p.displayName };
    if (p.age != null) item.age = { N: p.age.toString() };
    if (p.unit != null) item.unit = { S: p.unit };
    await this.client.send(
      new PutItemCommand({ TableName: this.tableName, Item: item })
    );
  }

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

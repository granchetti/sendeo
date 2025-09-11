import {
  DynamoDBClient,
  PutItemCommand,
  DeleteItemCommand,
  QueryCommand,
  GetItemCommand,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { UserProfileRepository } from "../../domain/repositories/user-profile-repository";
import { UserProfile } from "../../domain/entities/user-profile";
import { Email } from "../../../shared/domain/value-objects/email";

export class DynamoUserProfileRepository implements UserProfileRepository {
  constructor(private client: DynamoDBClient, private tableName: string) {}

  async putFavourite(email: Email, routeId: string): Promise<void> {
    await this.client.send(
      new PutItemCommand({
        TableName: this.tableName,
        Item: {
          PK: { S: `USER#${email.Value}` },
          SK: { S: `FAV#${routeId}` },
        },
      })
    );
  }

  async deleteFavourite(email: Email, routeId: string): Promise<void> {
    await this.client.send(
      new DeleteItemCommand({
        TableName: this.tableName,
        Key: {
          PK: { S: `USER#${email.Value}` },
          SK: { S: `FAV#${routeId}` },
        },
      })
    );
  }

  async getFavourites(email: Email): Promise<string[]> {
    const res = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :fav)",
        ExpressionAttributeValues: {
          ":pk": { S: `USER#${email.Value}` },
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

  async deleteProfile(email: Email): Promise<void> {
    const res = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": { S: `USER#${email.Value}` } },
        ProjectionExpression: "PK, SK",
      })
    );
    const items = res.Items || [];
    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25).map((item) => ({
        DeleteRequest: {
          Key: { PK: item.PK, SK: item.SK },
        },
      }));
      await this.client.send(
        new BatchWriteItemCommand({
          RequestItems: { [this.tableName]: batch },
        })
      );
    }
  }
}

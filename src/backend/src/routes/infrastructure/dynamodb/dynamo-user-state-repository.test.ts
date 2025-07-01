import {
  DynamoDBClient,
  PutItemCommand,
  DeleteItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { DynamoUserStateRepository } from "./dynamo-user-state-repository";

describe("DynamoUserStateRepository", () => {
  let mockSend: jest.Mock;
  let repo: DynamoUserStateRepository;
  const tableName = "UserState";
  const email = "test@example.com";
  const routeId = "123";

  beforeEach(() => {
    mockSend = jest.fn();
    const client = { send: mockSend } as unknown as DynamoDBClient;
    repo = new DynamoUserStateRepository(client, tableName);
  });

  it("putFavourite sends a PutItemCommand with correct params", async () => {
    await repo.putFavourite(email, routeId);
    expect(mockSend).toHaveBeenCalledTimes(1);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(PutItemCommand);
    expect((cmd as any).input).toEqual({
      TableName: tableName,
      Item: {
        PK: { S: `USER#${email}` },
        SK: { S: `FAV#${routeId}` },
      },
    });
  });

  it("deleteFavourite sends a DeleteItemCommand with correct params", async () => {
    await repo.deleteFavourite(email, routeId);
    expect(mockSend).toHaveBeenCalledTimes(1);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(DeleteItemCommand);
    expect((cmd as any).input).toEqual({
      TableName: tableName,
      Key: {
        PK: { S: `USER#${email}` },
        SK: { S: `FAV#${routeId}` },
      },
    });
  });

  it("getFavourites returns SK values from QueryCommand results", async () => {
    const items = [{ SK: { S: "FAV#1" } }, { SK: { S: "FAV#2" } }];
    mockSend.mockResolvedValueOnce({ Items: items });
    const result = await repo.getFavourites(email);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(QueryCommand);
    expect((cmd as any).input).toEqual({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": { S: `USER#${email}` } },
    });

    expect(result).toEqual(["FAV#1", "FAV#2"]);
  });

  it("getFavourites returns empty array if no items", async () => {
    mockSend.mockResolvedValueOnce({});
    const result = await repo.getFavourites(email);
    expect(mockSend).toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});

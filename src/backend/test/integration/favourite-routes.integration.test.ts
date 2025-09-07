import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

process.env.AWS_REGION = "us-east-1";
process.env.USER_STATE_TABLE = "UserState";

// in-memory store to mimic DynamoDB Local
const store = new Map<string, any>();

// mock DynamoDBClient send method to interact with in-memory store
const sendMock = jest
  .spyOn(DynamoDBClient.prototype, "send")
  .mockImplementation(async (command: any) => {
    const name = command.constructor.name;
    if (name === "PutItemCommand") {
      const item = command.input.Item as any;
      const pk = item.PK.S as string;
      const sk = item.SK.S as string;
      store.set(`${pk}|${sk}`, item);
      return {} as any;
    }
    if (name === "DeleteItemCommand") {
      const pk = command.input.Key!.PK.S as string;
      const sk = command.input.Key!.SK.S as string;
      store.delete(`${pk}|${sk}`);
      return {} as any;
    }
    if (name === "QueryCommand") {
      const pk = command.input.ExpressionAttributeValues![":pk"].S as string;
      const fav = command.input.ExpressionAttributeValues![":fav"].S as string;
      const items = Array.from(store.values()).filter(
        (i) => i.PK.S === pk && i.SK.S.startsWith(fav)
      );
      return { Items: items } as any;
    }
    return {} as any;
  });

import { handler } from "../../src/users/interfaces/http/favourite-routes";

describe("favourite routes integration", () => {
  const email = "test@example.com";
  const baseEvent: any = {
    requestContext: { authorizer: { claims: { email } } },
  };
  const key = (routeId: string) => `USER#${email}|FAV#${routeId}`;

  beforeEach(() => {
    store.clear();
  });

  afterAll(() => {
    sendMock.mockRestore();
  });

  it("returns favourites on GET", async () => {
    store.set(key("1"), { PK: { S: `USER#${email}` }, SK: { S: "FAV#1" } });
    store.set(key("2"), { PK: { S: `USER#${email}` }, SK: { S: "FAV#2" } });

    const res = await handler({ ...baseEvent, httpMethod: "GET" });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ favourites: ["1", "2"] });
  });

  it("adds favourite on POST", async () => {
    const res = await handler({
      ...baseEvent,
      httpMethod: "POST",
      body: JSON.stringify({ routeId: "1" }),
    });

    expect(res.statusCode).toBe(200);
    expect(store.get(key("1"))).toBeDefined();
  });

  it("returns 409 when favourite already exists", async () => {
    store.set(key("1"), { PK: { S: `USER#${email}` }, SK: { S: "FAV#1" } });

    const res = await handler({
      ...baseEvent,
      httpMethod: "POST",
      body: JSON.stringify({ routeId: "1" }),
    });

    expect(res.statusCode).toBe(409);
    expect(store.get(key("1"))).toBeDefined();
  });

  it("deletes favourite on DELETE", async () => {
    store.set(key("2"), { PK: { S: `USER#${email}` }, SK: { S: "FAV#2" } });

    const res = await handler({
      ...baseEvent,
      httpMethod: "DELETE",
      pathParameters: { routeId: "2" },
    });

    expect(res.statusCode).toBe(200);
    expect(store.get(key("2"))).toBeUndefined();
  });
});

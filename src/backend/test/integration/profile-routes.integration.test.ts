import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";

process.env.AWS_REGION = "us-east-1";
process.env.USER_STATE_TABLE = "UserState";

// in-memory store to mimic DynamoDB Local
const store = new Map<string, any>();

// mock DynamoDBClient send method to interact with in-memory store
const sendMock = jest
  .spyOn(DynamoDBClient.prototype, "send")
  .mockImplementation(async (command: any) => {
    if (command instanceof PutItemCommand) {
      const item = command.input.Item as any;
      const pk = item.PK.S as string;
      const sk = item.SK.S as string;
      store.set(`${pk}|${sk}`, item);
      return {} as any;
    }
    if (command instanceof GetItemCommand) {
      const pk = command.input.Key!.PK.S as string;
      const sk = command.input.Key!.SK.S as string;
      const item = store.get(`${pk}|${sk}`);
      return item ? ({ Item: item } as any) : ({} as any);
    }
    return {} as any;
  });

import { handler } from "../../src/users/interfaces/http/profile-routes";

describe("profile routes integration", () => {
  const email = "test@example.com";
  const baseEvent: any = {
    requestContext: { authorizer: { claims: { email } } },
  };
  const key = `USER#${email}|PROFILE`;

  beforeEach(() => {
    store.clear();
  });

  afterAll(() => {
    sendMock.mockRestore();
  });

  it("returns profile on GET", async () => {
    // Seed table with profile
    store.set(key, {
      PK: { S: `USER#${email}` },
      SK: { S: "PROFILE" },
      email: { S: email },
      firstName: { S: "John" },
    });

    const res = await handler({ ...baseEvent, httpMethod: "GET" });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ email, firstName: "John" });
  });

  it("updates profile on PUT", async () => {
    // Seed initial profile
    store.set(key, {
      PK: { S: `USER#${email}` },
      SK: { S: "PROFILE" },
      email: { S: email },
      firstName: { S: "Old" },
    });

    const payload = { firstName: "Jane", lastName: "Doe" };
    const res = await handler({
      ...baseEvent,
      httpMethod: "PUT",
      body: JSON.stringify(payload),
    });

    expect(res.statusCode).toBe(200);
    const item = store.get(key)!;
    expect(item.firstName.S).toBe("Jane");
    expect(item.lastName.S).toBe("Doe");
  });

  it("returns 401 when unauthorized", async () => {
    const res = await handler({ httpMethod: "GET", requestContext: {} as any });

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)).toEqual({ code: 401, message: "Unauthorized" });
  });
});


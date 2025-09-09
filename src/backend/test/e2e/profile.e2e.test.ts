jest.mock("@aws-sdk/client-dynamodb", () => {
  const store: Record<string, Map<string, any>> = {};

  class CreateTableCommand { constructor(public input: any) {} }
  class DeleteTableCommand { constructor(public input: any) {} }
  class PutItemCommand { constructor(public input: any) {} }
  class DeleteItemCommand { constructor(public input: any) {} }
  class GetItemCommand { constructor(public input: any) {} }
  class QueryCommand { constructor(public input: any) {} }
  class ScanCommand { constructor(public input: any) {} }

  class DynamoDBClient {
    static __reset() {
      Object.keys(store).forEach((k) => delete store[k]);
    }
    async send(cmd: any) {
      if (cmd instanceof CreateTableCommand) {
        const { TableName } = cmd.input;
        if (!store[TableName]) store[TableName] = new Map();
        return {};
      }
      if (cmd instanceof DeleteTableCommand) {
        const { TableName } = cmd.input;
        delete store[TableName];
        return {};
      }
      if (cmd instanceof PutItemCommand) {
        const { TableName, Item } = cmd.input;
        const key = `${Item.PK?.S}|${Item.SK?.S}`;
        if (!store[TableName]) store[TableName] = new Map();
        store[TableName].set(key, Item);
        return {};
      }
      if (cmd instanceof DeleteItemCommand) {
        const { TableName, Key } = cmd.input;
        const key = `${Key.PK?.S}|${Key.SK?.S}`;
        store[TableName]?.delete(key);
        return {};
      }
      if (cmd instanceof GetItemCommand) {
        const { TableName, Key } = cmd.input;
        const key = `${Key.PK?.S}|${Key.SK?.S}`;
        const Item = store[TableName]?.get(key);
        return { Item };
      }
      if (cmd instanceof QueryCommand) {
        const { TableName, ExpressionAttributeValues } = cmd.input;
        const pk = ExpressionAttributeValues?.[":pk"]?.S;
        const fav = ExpressionAttributeValues?.[":fav"]?.S;
        const Items = Array.from(store[TableName]?.values() || []).filter(
          (it: any) => it.PK?.S === pk && (fav ? (it.SK?.S || "").startsWith(fav) : true)
        );
        return { Items };
      }
      if (cmd instanceof ScanCommand) {
        const { TableName } = cmd.input;
        const Items = Array.from(store[TableName]?.values() || []);
        return { Items };
      }
      throw new Error(`Unsupported command: ${cmd?.constructor?.name}`);
    }
  }

  return {
    DynamoDBClient,
    CreateTableCommand,
    DeleteTableCommand,
    PutItemCommand,
    DeleteItemCommand,
    GetItemCommand,
    QueryCommand,
    ScanCommand,
  };
});

import {
  CreateTableCommand,
  DeleteTableCommand,
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";

let handler: any;

describe("profile API e2e", () => {
  const tableName = "UserState";
  const email = "test@example.com";
  const baseEvent: any = {
    requestContext: { authorizer: { claims: { email } } },
    headers: { Accept: "application/json" },
  };
  let client: DynamoDBClient;

  beforeAll(async () => {
    jest.setTimeout(30000);
    process.env.AWS_REGION = "us-east-1";
    process.env.AWS_ACCESS_KEY_ID = "x";
    process.env.AWS_SECRET_ACCESS_KEY = "x";
    process.env.AWS_ENDPOINT_URL_DYNAMODB = "http://localhost:0"; // unused in mock
    process.env.USER_STATE_TABLE = tableName;
    client = new DynamoDBClient({ region: "us-east-1" } as any);
    await client.send(
      new CreateTableCommand({
        TableName: tableName,
        AttributeDefinitions: [
          { AttributeName: "PK", AttributeType: "S" },
          { AttributeName: "SK", AttributeType: "S" },
        ],
        KeySchema: [
          { AttributeName: "PK", KeyType: "HASH" },
          { AttributeName: "SK", KeyType: "RANGE" },
        ],
        BillingMode: "PAY_PER_REQUEST",
      })
    );
    // Import the handler after env is set so repository picks up table name
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    handler = require("../../src/users/interfaces/http/profile-routes").handler;
  });

  afterAll(async () => {
    await client.send(new DeleteTableCommand({ TableName: tableName }));
  });

  beforeEach(async () => {
    const items = await client.send(new ScanCommand({ TableName: tableName }));
    await Promise.all(
      (items.Items || []).map((item: any) =>
        client.send(
          new DeleteItemCommand({ TableName: tableName, Key: { PK: item.PK, SK: item.SK } })
        )
      )
    );
  });

  it("returns profile on GET", async () => {
    await client.send(
      new PutItemCommand({
        TableName: tableName,
        Item: {
          PK: { S: `USER#${email}` },
          SK: { S: "PROFILE" },
          email: { S: email },
          firstName: { S: "John" },
        },
      })
    );

    const res = await handler({ ...baseEvent, httpMethod: "GET" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ email, firstName: "John" });
  });

  it("updates profile on PUT and persists", async () => {
    await client.send(
      new PutItemCommand({
        TableName: tableName,
        Item: {
          PK: { S: `USER#${email}` },
          SK: { S: "PROFILE" },
          email: { S: email },
          firstName: { S: "Old" },
        },
      })
    );

    const payload = { firstName: "Jane", lastName: "Doe" };
    const res = await handler({
      ...baseEvent,
      httpMethod: "PUT",
      body: JSON.stringify(payload),
    });
    expect(res.statusCode).toBe(200);

    const stored = await client.send(
      new GetItemCommand({
        TableName: tableName,
        Key: { PK: { S: `USER#${email}` }, SK: { S: "PROFILE" } },
      })
    );
    expect(stored.Item?.firstName?.S).toBe("Jane");
    expect(stored.Item?.lastName?.S).toBe("Doe");
  });
});

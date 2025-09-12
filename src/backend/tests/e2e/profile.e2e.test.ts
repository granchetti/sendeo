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
import { primeJwksForTesting } from "../../src/shared/auth/verify-jwt";
import { createProfileRoutesHandler } from "../../src/users/interfaces/http/profile-routes";
import { DynamoUserProfileRepository } from "../../src/users/infrastructure/dynamodb/dynamo-user-profile-repository";
import { createSign, generateKeyPairSync } from "crypto";

let handler: any;
let authHeader: string;

describe("profile API e2e", () => {
  const tableName = "UserState";
  const email = "test@example.com";
  const baseEvent: any = {
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
    const repo = new DynamoUserProfileRepository(client as any, tableName);
    handler = createProfileRoutesHandler(repo);
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

    const res = await handler({ ...baseEvent, httpMethod: "GET", headers: { ...baseEvent.headers, Authorization: authHeader } });
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
      headers: { ...baseEvent.headers, Authorization: authHeader },
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
    // Setup JWT verification (no network)
    process.env.COGNITO_USER_POOL_ID = "us-east-1_testpool";
    process.env.COGNITO_CLIENT_ID = "testclient";
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const jwk: any = publicKey.export({ format: "jwk" });
    jwk.kid = "e2e-profile-key";
    jwk.use = "sig";
    jwk.alg = "RS256";
    primeJwksForTesting({ keys: [jwk] } as any);
    const sign = (payload: any) => {
      const header = { alg: "RS256", kid: jwk.kid };
      const now = Math.floor(Date.now() / 1000);
      const body = {
        iss: `https://cognito-idp.us-east-1.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
        aud: process.env.COGNITO_CLIENT_ID,
        token_use: "id",
        exp: now + 3600,
        ...payload,
      };
      const enc = (o: any) => Buffer.from(JSON.stringify(o)).toString("base64url");
      const data = `${enc(header)}.${enc(body)}`;
      const s = createSign("RSA-SHA256");
      s.update(data);
      return `${data}.${s.sign(privateKey).toString("base64url")}`;
    };
    authHeader = `Bearer ${sign({ email })}`;
});

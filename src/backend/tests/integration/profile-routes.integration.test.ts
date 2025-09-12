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

import { primeJwksForTesting } from "../../src/shared/auth/verify-jwt";
import { createProfileRoutesHandler } from "../../src/users/interfaces/http/profile-routes";
import { DynamoUserProfileRepository } from "../../src/users/infrastructure/dynamodb/dynamo-user-profile-repository";
import { createSign, generateKeyPairSync } from "crypto";

const repository = new DynamoUserProfileRepository(new DynamoDBClient({}) as any, process.env.USER_STATE_TABLE!);
const handler = createProfileRoutesHandler(repository);

describe("profile routes integration", () => {
  const email = "test@example.com";
  const baseEvent: any = {
    headers: { Accept: "application/json" },
  };
  let authHeader: string;
  const key = `USER#${email}|PROFILE`;

  beforeEach(() => {
    store.clear();
  });

  afterAll(() => {
    sendMock.mockRestore();
  });

  beforeAll(() => {
    process.env.COGNITO_USER_POOL_ID = "us-east-1_testpool";
    process.env.COGNITO_CLIENT_ID = "testclient";
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const jwk: any = publicKey.export({ format: "jwk" });
    jwk.kid = "it-profile-key";
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

  it("returns profile on GET", async () => {
    // Seed table with profile
    store.set(key, {
      PK: { S: `USER#${email}` },
      SK: { S: "PROFILE" },
      email: { S: email },
      firstName: { S: "John" },
    });

    const res = await handler({ ...baseEvent, httpMethod: "GET", headers: { ...baseEvent.headers, Authorization: authHeader } });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ email, firstName: "John" });
  });

  it("accepts mixed Accept headers", async () => {
    store.set(key, {
      PK: { S: `USER#${email}` },
      SK: { S: "PROFILE" },
      email: { S: email },
    });

    const res = await handler({
      ...baseEvent,
      headers: { Accept: "text/plain, application/json", Authorization: authHeader },
      httpMethod: "GET",
    });

    expect(res.statusCode).toBe(200);
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
      headers: { ...baseEvent.headers, Authorization: authHeader },
      body: JSON.stringify(payload),
    });

    expect(res.statusCode).toBe(200);
    const item = store.get(key)!;
    expect(item.firstName.S).toBe("Jane");
    expect(item.lastName.S).toBe("Doe");
  });

  it("returns 401 when unauthorized", async () => {
    const res = await handler({ httpMethod: "GET", requestContext: {} as any, headers: { Accept: "application/json" } } as any);

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)).toMatchObject({
      code: 401,
      message: "Unauthorized",
    });
  });
});

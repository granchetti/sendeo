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

import { primeJwksForTesting } from "../../src/shared/auth/verify-jwt";
import { createFavouriteRoutesHandler } from "../../src/users/interfaces/http/favourite-routes";
import { DynamoUserProfileRepository } from "../../src/users/infrastructure/dynamodb/dynamo-user-profile-repository";
import { createSign, generateKeyPairSync } from "crypto";

const repository = new DynamoUserProfileRepository(new DynamoDBClient({}) as any, process.env.USER_STATE_TABLE!);
const handler = createFavouriteRoutesHandler(repository);

describe("favourite routes integration", () => {
  const email = "test@example.com";
  const baseEvent: any = {
    headers: { Accept: "application/json" },
  };
  let authHeader: string;
  const key = (routeId: string) => `USER#${email}|FAV#${routeId}`;

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
    jwk.kid = "it-fav-key";
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

  it("returns favourites on GET", async () => {
    store.set(key("1"), { PK: { S: `USER#${email}` }, SK: { S: "FAV#1" } });
    store.set(key("2"), { PK: { S: `USER#${email}` }, SK: { S: "FAV#2" } });

    const res = await handler({ ...baseEvent, httpMethod: "GET", headers: { ...baseEvent.headers, Authorization: authHeader } });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ favourites: ["1", "2"] });
  });

  it("adds favourite on POST", async () => {
    const res = await handler({
      ...baseEvent,
      httpMethod: "POST",
      headers: { ...baseEvent.headers, Authorization: authHeader },
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
      headers: { ...baseEvent.headers, Authorization: authHeader },
      body: JSON.stringify({ routeId: "1" }),
    });

    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body)).toMatchObject({
      code: 409,
      message: "Route already in favourites",
    });
    expect(store.get(key("1"))).toBeDefined();
  });

  it("deletes favourite on DELETE", async () => {
    store.set(key("2"), { PK: { S: `USER#${email}` }, SK: { S: "FAV#2" } });

    const res = await handler({
      ...baseEvent,
      httpMethod: "DELETE",
      headers: { ...baseEvent.headers, Authorization: authHeader },
      pathParameters: { routeId: "2" },
    });

    expect(res.statusCode).toBe(200);
    expect(store.get(key("2"))).toBeUndefined();
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

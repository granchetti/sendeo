import { handler } from "../../src/users/interfaces/http/favourite-routes";
import {
  DynamoDBClient,
  CreateTableCommand,
  DeleteTableCommand,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  DeleteItemCommand,
  ListTablesCommand,
} from "@aws-sdk/client-dynamodb";
import { publishFavouriteSaved, publishFavouriteDeleted } from "../../src/routes/interfaces/appsync-client";

// Mock the appsync client publish functions
jest.mock("../../src/routes/interfaces/appsync-client", () => ({
  publishFavouriteSaved: jest.fn(),
  publishFavouriteDeleted: jest.fn(),
}));

const dynamodbLocal = require("dynamodb-local");

const TABLE_NAME = "user-state";
const PORT = 8000;
let client: DynamoDBClient;

beforeAll(async () => {
  await dynamodbLocal.launch(PORT, null, ["-inMemory", "-sharedDb"]);

  process.env.AWS_REGION = "us-east-1";
  process.env.AWS_ACCESS_KEY_ID = "x";
  process.env.AWS_SECRET_ACCESS_KEY = "x";
  process.env.AWS_ENDPOINT_URL_DYNAMODB = `http://localhost:${PORT}`;
  process.env.USER_STATE_TABLE = TABLE_NAME;

    client = new DynamoDBClient({
      endpoint: process.env.AWS_ENDPOINT_URL_DYNAMODB,
      region: "us-east-1",
    });

    // wait for DynamoDB local to be ready
    for (let i = 0; i < 5; i++) {
      try {
        await client.send(new ListTablesCommand({}));
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    await client.send(
      new CreateTableCommand({
        TableName: TABLE_NAME,
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
  });

afterAll(async () => {
  await client.send(new DeleteTableCommand({ TableName: TABLE_NAME }));
  await dynamodbLocal.stop(PORT);
});

beforeEach(async () => {
  // clear table
  const items = await client.send(new ScanCommand({ TableName: TABLE_NAME, ProjectionExpression: "PK, SK" }));
  const deletes = (items.Items || []).map((i) =>
    client.send(
      new DeleteItemCommand({ TableName: TABLE_NAME, Key: { PK: i.PK, SK: i.SK } })
    )
  );
  await Promise.all(deletes);
  (publishFavouriteSaved as jest.Mock).mockClear();
  (publishFavouriteDeleted as jest.Mock).mockClear();
});

describe("favourite routes integration", () => {
  it("handles GET, POST and DELETE flows", async () => {
    const email = "user@example.com";

    // Pre-load one favourite for GET
    await client.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: { PK: { S: `USER#${email}` }, SK: { S: "FAV#1" } },
      })
    );

    const getRes = await handler({
      httpMethod: "GET",
      requestContext: { authorizer: { claims: { email } } },
    } as any);
    expect(getRes.statusCode).toBe(200);
    expect(JSON.parse(getRes.body)).toEqual({ favourites: ["1"] });

    const postRes = await handler({
      httpMethod: "POST",
      body: JSON.stringify({ routeId: "2" }),
      requestContext: { authorizer: { claims: { email } } },
    } as any);
    expect(postRes.statusCode).toBe(200);
    expect(publishFavouriteSaved).toHaveBeenCalledWith(email, "2");
    const queryAfterPost = await client.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": { S: `USER#${email}` } },
      })
    );
    const favsAfterPost = (queryAfterPost.Items || []).map((i) => i.SK.S);
    expect(favsAfterPost).toContain("FAV#2");

    const deleteRes = await handler({
      httpMethod: "DELETE",
      pathParameters: { routeId: "2" },
      requestContext: { authorizer: { claims: { email } } },
    } as any);
    expect(deleteRes.statusCode).toBe(200);
    expect(publishFavouriteDeleted).toHaveBeenCalledWith(email, "2");
    const queryAfterDelete = await client.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": { S: `USER#${email}` } },
      })
    );
    const favsAfterDelete = (queryAfterDelete.Items || []).map((i) => i.SK.S);
    expect(favsAfterDelete).not.toContain("FAV#2");
  });
});

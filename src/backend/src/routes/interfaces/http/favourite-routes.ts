import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoUserStateRepository } from "../../infrastructure/dynamodb/dynamo-user-state-repository";
import {
  publishFavouriteSaved,
  publishFavouriteDeleted,
} from "../appsync-client";

const dynamo = new DynamoDBClient({});
const repository = new DynamoUserStateRepository(
  dynamo,
  process.env.USER_STATE_TABLE!
);

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const email = (event.requestContext as any).authorizer?.claims?.email;
  if (!email) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const { httpMethod } = event;

  if (httpMethod === "POST") {
    let payload: any;
    try {
      payload = event.body ? JSON.parse(event.body) : {};
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid JSON body" }),
      };
    }

    const routeId = payload.routeId;
    if (!routeId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "routeId required" }),
      };
    }

    const existing = await repository.getFavourites(email);
    if (existing.includes(routeId)) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "Route already in favourites" }),
      };
    }

    await repository.putFavourite(email, routeId);
    await publishFavouriteSaved(email, routeId);
    return { statusCode: 200, body: JSON.stringify({ saved: true }) };
  }

  if (httpMethod === "DELETE") {
    const routeId = event.pathParameters?.routeId;
    if (!routeId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "routeId parameter required" }),
      };
    }
    await repository.deleteFavourite(email, routeId);
    await publishFavouriteDeleted(email, routeId);
    return { statusCode: 200, body: JSON.stringify({ deleted: true }) };
  }

  return {
    statusCode: 501,
    body: JSON.stringify({ error: "Not Implemented" }),
  };
};

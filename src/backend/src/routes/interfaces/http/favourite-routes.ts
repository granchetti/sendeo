import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoUserStateRepository } from "../../infrastructure/dynamodb/dynamo-user-state-repository";
import { AddFavouriteUseCase, FavouriteAlreadyExistsError } from "../../application/use-cases/add-favourite";
import { RemoveFavouriteUseCase } from "../../application/use-cases/remove-favourite";

const dynamo = new DynamoDBClient({});
const repository = new DynamoUserStateRepository(
  dynamo,
  process.env.USER_STATE_TABLE!
);
const addFavourite = new AddFavouriteUseCase(repository);
const removeFavourite = new RemoveFavouriteUseCase(repository);

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

    try {
      await addFavourite.execute(email, routeId);
    } catch (err) {
      if (err instanceof FavouriteAlreadyExistsError) {
        return {
          statusCode: 409,
          body: JSON.stringify({ error: "Route already in favourites" }),
        };
      }
      throw err;
    }
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
    await removeFavourite.execute(email, routeId);
    return { statusCode: 200, body: JSON.stringify({ deleted: true }) };
  }

  return {
    statusCode: 501,
    body: JSON.stringify({ error: "Not Implemented" }),
  };
};

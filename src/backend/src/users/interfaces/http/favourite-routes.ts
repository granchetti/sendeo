import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoUserProfileRepository } from "../../infrastructure/dynamodb/dynamo-user-profile-repository";
import {
  publishFavouriteSaved,
  publishFavouriteDeleted,
} from "../../../routes/interfaces/appsync-client";
import { AddFavouriteUseCase, FavouriteAlreadyExistsError } from "../../application/use-cases/add-favourite";
import { RemoveFavouriteUseCase } from "../../application/use-cases/remove-favourite";
import { jsonHeaders } from "../../../http/cors";
import { Email } from "../../../shared/domain/value-objects/email";

const dynamo = new DynamoDBClient({
  endpoint: process.env.AWS_ENDPOINT_URL_DYNAMODB,
});
const repository = new DynamoUserProfileRepository(
  dynamo,
  process.env.USER_STATE_TABLE!
);
const addFavourite = new AddFavouriteUseCase(repository);
const removeFavourite = new RemoveFavouriteUseCase(repository);

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const accept = event.headers?.Accept || event.headers?.accept;
  if (accept !== "application/json") {
    return {
      statusCode: 415,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Unsupported Media Type" }),
    };
  }
  const emailStr = (event.requestContext as any).authorizer?.claims?.email;
  if (!emailStr) {
    return {
      statusCode: 401,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }
  const email = Email.fromString(emailStr);

  const { httpMethod } = event;

  if (httpMethod === "GET") {
    try {
      const items = await repository.getFavourites(email);
      const favourites = items.map((s) => (s.startsWith("FAV#") ? s.slice(4) : s));
      return {
        statusCode: 200,
        headers: jsonHeaders,
        body: JSON.stringify({ favourites }),
      };
    } catch (err) {
      console.error("❌ Error reading favourites:", err);
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({ error: "Could not fetch favourites" }),
      };
    }
  }

  if (httpMethod === "POST") {
    let payload: any;
    try {
      payload = event.body ? JSON.parse(event.body) : {};
    } catch {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ error: "Invalid JSON body" }),
      };
    }

    const routeId = payload.routeId;
    if (!routeId) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ error: "routeId required" }),
      };
    }

    try {
      await addFavourite.execute(email, routeId);
    } catch (err) {
      if (err instanceof FavouriteAlreadyExistsError) {
        return {
          statusCode: 409,
          headers: jsonHeaders,
          body: JSON.stringify({ error: "Route already in favourites" }),
        };
      }
      throw err;
    }
    await publishFavouriteSaved(email.Value, routeId);
    return { statusCode: 200, headers: jsonHeaders, body: JSON.stringify({ saved: true }) };
  }

  if (httpMethod === "DELETE") {
    const routeId = event.pathParameters?.routeId;
    if (!routeId) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ error: "routeId parameter required" }),
      };
    }
    await removeFavourite.execute(email, routeId);
    await publishFavouriteDeleted(email.Value, routeId);
    return { statusCode: 200, headers: jsonHeaders, body: JSON.stringify({ deleted: true }) };
  }

  return {
    statusCode: 501,
    headers: jsonHeaders,
    body: JSON.stringify({ error: "Not Implemented" }),
  };
};

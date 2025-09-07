import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoUserProfileRepository } from "../../infrastructure/dynamodb/dynamo-user-profile-repository";
import {
  publishFavouriteSaved,
  publishFavouriteDeleted,
} from "../../../routes/interfaces/appsync-client";
import { AddFavouriteUseCase, FavouriteAlreadyExistsError } from "../../application/use-cases/add-favourite";
import { RemoveFavouriteUseCase } from "../../application/use-cases/remove-favourite";
import { corsHeaders } from "../../../http/cors";
import { errorResponse } from "../../../http/error-response";
import { Email } from "../../../shared/domain/value-objects/email";
import { hasScope, Scope } from "../../../auth/scopes";

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
  const claims = (event.requestContext as any).authorizer?.claims;
  const emailStr = claims?.email;
  if (!emailStr) {
    return errorResponse(401, "Unauthorized");
  }
  if (!hasScope(claims, Scope.FAVOURITES)) {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: "Forbidden" }) };
  }
  const email = Email.fromString(emailStr);

  const { httpMethod } = event;

  if (httpMethod === "GET") {
    try {
      const items = await repository.getFavourites(email);
      const favourites = items.map((s) => (s.startsWith("FAV#") ? s.slice(4) : s));
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ favourites }),
      };
    } catch (err) {
      console.error("❌ Error reading favourites:", err);
      return errorResponse(500, "Could not fetch favourites");
    }
  }

  if (httpMethod === "POST") {
    let payload: any;
    try {
      payload = event.body ? JSON.parse(event.body) : {};
    } catch {
      return errorResponse(400, "Invalid JSON body");
    }

    const routeId = payload.routeId;
    if (!routeId) {
      return errorResponse(400, "routeId required");
    }

    try {
      await addFavourite.execute(email, routeId);
    } catch (err) {
      if (err instanceof FavouriteAlreadyExistsError) {
        return errorResponse(409, "Route already in favourites");
      }
      throw err;
    }
    await publishFavouriteSaved(email.Value, routeId);
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ saved: true }) };
  }

  if (httpMethod === "DELETE") {
    const routeId = event.pathParameters?.routeId;
    if (!routeId) {
      return errorResponse(400, "routeId parameter required");
    }
    await removeFavourite.execute(email, routeId);
    await publishFavouriteDeleted(email.Value, routeId);
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ deleted: true }) };
  }

  return errorResponse(501, "Not Implemented");
};

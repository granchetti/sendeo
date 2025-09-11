import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  publishFavouriteSaved,
  publishFavouriteDeleted,
} from "../../../routes/interfaces/appsync-client";
import {
  AddFavouriteUseCase,
  FavouriteAlreadyExistsError,
} from "../../application/use-cases/add-favourite";
import { RemoveFavouriteUseCase } from "../../application/use-cases/remove-favourite";
import { jsonHeaders } from "../../../http/cors";
import { errorResponse } from "../../../http/error-response";
import { base } from "../../../http/base";
import { Email } from "../../../shared/domain/value-objects/email";
import { rateLimit } from "../../../http/rate-limit";
import type { UserProfileRepository } from "../../domain/repositories/user-profile-repository";
import { verifyJwt } from "../../../shared/auth/verify-jwt";

export function createFavouriteRoutesHandler(repo: UserProfileRepository) {
  const addFavourite = new AddFavouriteUseCase(repo);
  const removeFavourite = new RemoveFavouriteUseCase(repo);

  return base(
    rateLimit(async (
      event: APIGatewayProxyEvent
    ): Promise<APIGatewayProxyResult> => {
      const authHeader =
        event.headers?.Authorization || event.headers?.authorization;
      if (!authHeader) {
        return errorResponse(401, "Unauthorized");
      }
      let claims: any;
      try {
        const token = authHeader.replace(/^Bearer\s+/i, "");
        claims = await verifyJwt(token);
        if (event.requestContext && typeof event.requestContext === "object") {
          const ctx: any = event.requestContext as any;
          ctx.authorizer = {
            ...(ctx.authorizer || {}),
            claims,
          };
        }
      } catch (err) {
        console.error("JWT verification failed:", err);
        return errorResponse(401, "Unauthorized");
      }
      const emailStr = claims?.email;
      if (!emailStr) {
        return errorResponse(401, "Unauthorized");
      }
      const email = Email.fromString(emailStr);

      const { httpMethod } = event;

      if (httpMethod === "GET") {
        try {
          const items = await repo.getFavourites(email);
          const favourites = items.map((s) =>
            s.startsWith("FAV#") ? s.slice(4) : s
          );
          return {
            statusCode: 200,
            headers: jsonHeaders,
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
        await publishFavouriteSaved(email.Value, routeId, 1);
        return {
          statusCode: 200,
          headers: jsonHeaders,
          body: JSON.stringify({ saved: true }),
        };
      }

      if (httpMethod === "DELETE") {
        const routeId = event.pathParameters?.routeId;
        if (!routeId) {
          return errorResponse(400, "routeId parameter required");
        }
        await removeFavourite.execute(email, routeId);
        await publishFavouriteDeleted(email.Value, routeId, 1);
        return {
          statusCode: 200,
          headers: jsonHeaders,
          body: JSON.stringify({ deleted: true }),
        };
      }

      return errorResponse(501, "Not Implemented");
    })
  );
}

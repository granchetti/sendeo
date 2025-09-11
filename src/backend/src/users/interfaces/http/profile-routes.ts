import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { GetUserProfileUseCase } from "../../application/use-cases/get-user-profile";
import { UpdateUserProfileUseCase } from "../../application/use-cases/update-user-profile";
import { DeleteUserProfileUseCase } from "../../application/use-cases/delete-user-profile";
import { Email } from "../../../shared/domain/value-objects/email";
import { UserProfile } from "../../domain/entities/user-profile";
import { jsonHeaders } from "../../../http/cors";
import { errorResponse } from "../../../http/error-response";
import { base } from "../../../http/base";
import { rateLimit } from "../../../http/rate-limit";
import { UserProfileRepository } from "../../domain/repositories/user-profile-repository";

export const createProfileRoutesHandler = (
  repository: UserProfileRepository
) => {
  const getUserProfile = new GetUserProfileUseCase(repository);
  const updateUserProfile = new UpdateUserProfileUseCase(repository);
  const deleteUserProfile = new DeleteUserProfileUseCase(repository);

  return base(
    rateLimit(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
      const claims = (event.requestContext as any).authorizer?.claims;
      const email = claims?.email;
      if (!email) {
        return errorResponse(401, "Unauthorized");
      }
      const { httpMethod } = event;

      if (httpMethod === "GET") {
        const profile = await getUserProfile.execute(Email.fromString(email));
        return {
          statusCode: 200,
          headers: jsonHeaders,
          body: JSON.stringify(profile.toPrimitives()),
        };
      }

      if (httpMethod === "PUT") {
        let payload: any = {};
        if (event.body) {
          try {
            payload = JSON.parse(event.body);
          } catch {
            return errorResponse(400, "Invalid JSON body");
          }
        }
        const profile = UserProfile.fromPrimitives({
          email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          displayName: payload.displayName,
          age: payload.age != null ? Number(payload.age) : undefined,
          unit: payload.unit,
        });
        await updateUserProfile.execute(profile);
        return {
          statusCode: 200,
          headers: jsonHeaders,
          body: JSON.stringify({ updated: true }),
        };
      }

      if (httpMethod === "DELETE") {
        await deleteUserProfile.execute(Email.fromString(email));
        return {
          statusCode: 200,
          headers: jsonHeaders,
          body: JSON.stringify({ deleted: true }),
        };
      }

      return errorResponse(501, "Not Implemented");
    })
  );
};

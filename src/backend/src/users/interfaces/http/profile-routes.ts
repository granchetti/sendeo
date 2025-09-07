import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoUserProfileRepository } from "../../infrastructure/dynamodb/dynamo-user-profile-repository";
import { GetUserProfileUseCase } from "../../application/use-cases/get-user-profile";
import { UpdateUserProfileUseCase } from "../../application/use-cases/update-user-profile";
import { Email } from "../../../shared/domain/value-objects/email";
import { UserProfile } from "../../domain/entities/user-profile";
import { corsHeaders } from "../../../http/cors";
import { hasScope, Scope } from "../../../auth/scopes";
import { errorResponse } from "../../../http/error-response";

const dynamo = new DynamoDBClient({
  endpoint: process.env.AWS_ENDPOINT_URL_DYNAMODB,
});
const repository = new DynamoUserProfileRepository(
  dynamo,
  process.env.USER_STATE_TABLE!
);
const getUserProfile = new GetUserProfileUseCase(repository);
const updateUserProfile = new UpdateUserProfileUseCase(repository);

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const claims = (event.requestContext as any).authorizer?.claims;
  const email = claims?.email;
  if (!email) {
    return errorResponse(401, "Unauthorized");
  }
  if (!hasScope(claims, Scope.PROFILE)) {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: "Forbidden" }) };
  }
  const { httpMethod } = event;

  if (httpMethod === "GET") {
    const profile = await getUserProfile.execute(Email.fromString(email));
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(profile.toPrimitives()) };
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
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ updated: true }) };
  }

  return errorResponse(501, "Not Implemented");
};

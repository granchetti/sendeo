import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoUserStateRepository } from "../../infrastructure/dynamodb/dynamo-user-state-repository";
import { GetUserProfileUseCase } from "../../application/use-cases/get-user-profile";
import { UpdateUserProfileUseCase } from "../../application/use-cases/update-user-profile";
import { Email } from "../../../routes/domain/value-objects/email-value-object";
import { UserProfile } from "../../domain/entities/user-profile";

const dynamo = new DynamoDBClient({});
const repository = new DynamoUserStateRepository(
  dynamo,
  process.env.USER_STATE_TABLE!
);
const getUserProfile = new GetUserProfileUseCase(repository);
const updateUserProfile = new UpdateUserProfileUseCase(repository);

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const email = (event.requestContext as any).authorizer?.claims?.email;
  if (!email) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }
  const { httpMethod } = event;

  if (httpMethod === "GET") {
    const profile = await getUserProfile.execute(Email.fromString(email));
    return { statusCode: 200, body: JSON.stringify(profile.toPrimitives()) };
  }

  if (httpMethod === "PUT") {
    let payload: any = {};
    if (event.body) {
      try {
        payload = JSON.parse(event.body);
      } catch {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
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
    return { statusCode: 200, body: JSON.stringify({ updated: true }) };
  }

  return { statusCode: 501, body: JSON.stringify({ error: "Not Implemented" }) };
};

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoUserProfileRepository } from "./dynamodb/dynamo-user-profile-repository";
import { createFavouriteRoutesHandler } from "../interfaces/http/favourite-routes";
import { createProfileRoutesHandler } from "../interfaces/http/profile-routes";

const dynamo = new DynamoDBClient({
  endpoint: process.env.AWS_ENDPOINT_URL_DYNAMODB,
});
const repository = new DynamoUserProfileRepository(
  dynamo,
  process.env.USER_STATE_TABLE!
);

export const favouriteRoutesHandler = createFavouriteRoutesHandler(repository);
export const profileRoutesHandler = createProfileRoutesHandler(repository);

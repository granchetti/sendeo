import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { DynamoRouteRepository } from "../../infrastructure/dynamodb/dynamo-route-repository";
import { DynamoUserStateRepository } from "../../../users/infrastructure/dynamodb/dynamo-user-state-repository";
import {
  publishRouteStarted,
  publishRouteFinished,
} from "../appsync-client";
import { UUID } from "../../domain/value-objects/uuid-value-object";
import { ListRoutesUseCase } from "../../application/use-cases/list-routes";
import { GetRouteDetailsUseCase } from "../../application/use-cases/get-route-details";
import { GetUserProfileUseCase } from "../../../users/application/use-cases/get-user-profile";
import { UpdateUserProfileUseCase } from "../../../users/application/use-cases/update-user-profile";
import { Email } from "../../domain/value-objects/email-value-object";
import { UserProfile } from "../../../users/domain/entities/user-profile";

const dynamo = new DynamoDBClient({});
const sqs = new SQSClient({});
const routeRepository = new DynamoRouteRepository(
  dynamo,
  process.env.ROUTES_TABLE!
);
const userStateRepository = new DynamoUserStateRepository(
  dynamo,
  process.env.USER_STATE_TABLE!
);
const listRoutes = new ListRoutesUseCase(routeRepository);
const getRouteDetails = new GetRouteDetailsUseCase(routeRepository);
const getUserProfile = new GetUserProfileUseCase(userStateRepository);
const updateUserProfile = new UpdateUserProfileUseCase(userStateRepository);

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { httpMethod, resource, pathParameters } = event;
  const email = (event.requestContext as any).authorizer?.claims?.email;
  if (!email) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }
  // GET /routes
  if (httpMethod === "GET" && resource === "/routes") {
    try {
      const all = await listRoutes.execute();
      return {
        statusCode: 200,
        body: JSON.stringify(
          all.map((r) => ({
            routeId: r.routeId.Value,
            distanceKm: r.distanceKm?.Value,
            duration: r.duration?.Value,
            path: r.path?.Encoded,
          }))
        ),
      };
    } catch (err) {
      console.error("Error listing routes:", err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Could not list routes" }),
      };
    }
  }

  // GET /routes/{routeId}
  if (httpMethod === "GET" && resource === "/routes/{routeId}") {
    const routeId = pathParameters?.routeId;
    if (!routeId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "routeId parameter required" }),
      };
    }

    const route = await getRouteDetails.execute(UUID.fromString(routeId));
    if (!route) {
      return { statusCode: 404, body: JSON.stringify({ error: "Not Found" }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        routeId: route.routeId.Value,
        distanceKm: route.distanceKm?.Value,
        duration: route.duration?.Value,
        path: route.path?.Encoded,
      }),
    };
  }

  // GET /jobs/{jobId}/routes
  if (httpMethod === "GET" && resource === "/jobs/{jobId}/routes") {
    const jobId = pathParameters?.jobId;
    if (!jobId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "jobId parameter required" }),
      };
    }
    try {
      const list = await routeRepository.findByJobId(jobId);
      return {
        statusCode: 200,
        body: JSON.stringify(
          list.map((r) => ({
            routeId: r.routeId.Value,
            distanceKm: r.distanceKm?.Value,
            duration: r.duration?.Value,
            path: r.path?.Encoded,
          }))
        ),
      };
    } catch (err) {
      console.error("Error listing job routes:", err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Could not list routes" }),
      };
    }
  }

  if (resource === "/profile" && httpMethod === "GET") {
    const profile = await getUserProfile.execute(Email.fromString(email));
    return { statusCode: 200, body: JSON.stringify(profile.toPrimitives()) };
  }

  if (resource === "/profile" && httpMethod === "PUT") {
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

  if (httpMethod === "GET" && resource === "/favourites") {
    try {
      const items = await userStateRepository.getFavourites(email);
      const favourites = items.map((s) =>
        s.startsWith("FAV#") ? s.slice(4) : s
      );
      return {
        statusCode: 200,
        body: JSON.stringify({ favourites }),
      };
    } catch (err) {
      console.error("❌ Error reading favourites:", err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Could not fetch favourites" }),
      };
    }
  }

  if (resource === "/telemetry/started" && httpMethod === "POST") {
    let payload: any = {};
    if (event.body) {
      try {
        payload = JSON.parse(event.body);
      } catch {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Invalid JSON body" }),
        };
      }
    }

    const routeId = payload.routeId;
    if (!routeId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "routeId required" }),
      };
    }

    await sqs.send(
      new SendMessageCommand({
        QueueUrl: process.env.METRICS_QUEUE!,
        MessageBody: JSON.stringify({
          event: "started",
          routeId,
          email,
          timestamp: Date.now(),
        }),
      })
    );

    try {
      await publishRouteStarted(email, routeId);
    } catch (err) {
      console.error("❌ Error publishing route started:", err);
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  if (resource === "/routes/{routeId}/finish" && httpMethod === "POST") {
    const routeId = pathParameters?.routeId;
    if (!routeId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "routeId parameter required" }),
      };
    }

    const route = await getRouteDetails.execute(UUID.fromString(routeId));
    if (!route) {
      return { statusCode: 404, body: JSON.stringify({ error: "Not Found" }) };
    }

    await sqs.send(
      new SendMessageCommand({
        QueueUrl: process.env.METRICS_QUEUE!,
        MessageBody: JSON.stringify({
          event: "finished",
          routeId,
          email,
          timestamp: Date.now(),
        }),
      })
    );

    try {
      await publishRouteFinished(
        email,
        routeId,
        JSON.stringify({
          routeId: route.routeId.Value,
          distanceKm: route.distanceKm?.Value,
          duration: route.duration?.Value,
          path: route.path?.Encoded,
        })
      );
    } catch (err) {
      console.error("❌ Error publishing route finished:", err);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        routeId: route.routeId.Value,
        distanceKm: route.distanceKm?.Value,
        duration: route.duration?.Value,
        path: route.path?.Encoded,
      }),
    };
  }

  return {
    statusCode: 501,
    body: JSON.stringify({ error: "Not Implemented" }),
  };
};

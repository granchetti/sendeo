import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { DynamoRouteRepository } from "../../infrastructure/dynamodb/dynamo-route-repository";
import { DynamoUserActivityRepository } from "../../../users/infrastructure/dynamodb/dynamo-user-activity-repository";
import { publishRouteStarted, publishRouteFinished } from "../appsync-client";
import { UUID } from "../../../shared/domain/value-objects/uuid";
import { ListRoutesUseCase } from "../../application/use-cases/list-routes";
import { DescribeRouteUseCase } from "../../application/use-cases/describe-route";
import { BedrockRouteDescriptionService } from "../../infrastructure/bedrock-route-description-service";
import { GetRouteDetailsUseCase } from "../../application/use-cases/get-route-details";
import { StartRouteUseCase } from "../../application/use-cases/start-route";
import { FinishRouteUseCase } from "../../application/use-cases/finish-route";
import { jsonHeaders } from "../../../http/cors";
import { getGoogleKey } from "../shared/utils";
import { GoogleMapsProvider } from "../../infrastructure/google-maps/google-maps-provider";
import {
  EventDispatcher,
  InMemoryEventDispatcher,
} from "../../../shared/domain/events/event-dispatcher";
import { RouteStartedEvent } from "../../domain/events/route-started";
import { RouteFinishedEvent } from "../../domain/events/route-finished";

const dynamo = new DynamoDBClient({
  endpoint: process.env.AWS_ENDPOINT_URL_DYNAMODB,
});
const sqs = new SQSClient({});
const routeRepository = new DynamoRouteRepository(
  dynamo,
  process.env.ROUTES_TABLE!
);
const userActivityRepository = new DynamoUserActivityRepository(
  dynamo,
  process.env.USER_STATE_TABLE!
);
const dispatcher: EventDispatcher = new InMemoryEventDispatcher();
dispatcher.subscribe("RouteStarted", async (event: RouteStartedEvent) => {
  await sqs.send(
    new SendMessageCommand({
      QueueUrl: process.env.METRICS_QUEUE!,
      MessageBody: JSON.stringify({
        event: "started",
        routeId: event.route.routeId.Value,
        email: event.email,
        timestamp: event.timestamp,
      }),
    })
  );
  try {
    await publishRouteStarted(event.email, event.route.routeId.Value);
  } catch (err) {
    console.error("❌ Error publishing route started:", err);
  }
});
dispatcher.subscribe("RouteFinished", async (event: RouteFinishedEvent) => {
  await sqs.send(
    new SendMessageCommand({
      QueueUrl: process.env.METRICS_QUEUE!,
      MessageBody: JSON.stringify({
        event: "finished",
        routeId: event.route.routeId.Value,
        email: event.email,
        timestamp: event.timestamp,
        ...(event.actualDuration != null
          ? { actualDuration: event.actualDuration }
          : {}),
      }),
    })
  );
  try {
    await publishRouteFinished(
      event.email,
      event.route.routeId.Value,
      JSON.stringify({
        routeId: event.route.routeId.Value,
        distanceKm: event.route.distanceKm?.Value,
        duration: event.route.duration?.Value,
        path: event.route.path?.Encoded,
        description: event.route.description,
        ...(event.actualDuration != null
          ? { actualDuration: event.actualDuration }
          : {}),
      })
    );
  } catch (err) {
    console.error("❌ Error publishing route finished:", err);
  }
});

const listRoutes = new ListRoutesUseCase(routeRepository);
const routeDescriptionService = new BedrockRouteDescriptionService();
const describeRouteUseCase = new DescribeRouteUseCase(
  routeRepository,
  routeDescriptionService
);
const startRouteUseCase = new StartRouteUseCase(routeRepository, dispatcher);
const finishRouteUseCase = new FinishRouteUseCase(routeRepository, dispatcher);

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
  const { httpMethod, resource, pathParameters } = event;
  const email = (event.requestContext as any).authorizer?.claims?.email;
  if (!email) {
    return {
      statusCode: 401,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }
  // GET /routes
  if (httpMethod === "GET" && resource === "/routes") {
    try {
      const all = await listRoutes.execute();
      return {
        statusCode: 200,
        headers: jsonHeaders,
        body: JSON.stringify(
          all.map((r) => ({
            routeId: r.routeId.Value,
            distanceKm: r.distanceKm?.Value,
            duration: r.duration?.Value,
            path: r.path?.Encoded,
            description: r.description,
          }))
        ),
      };
    } catch (err) {
      console.error("Error listing routes:", err);
      return {
        statusCode: 500,
        headers: jsonHeaders,
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
        headers: jsonHeaders,
        body: JSON.stringify({ error: "routeId parameter required" }),
      };
    }

    const route = await routeRepository.findById(UUID.fromString(routeId));
    if (!route) {
      return {
        statusCode: 404,
        headers: jsonHeaders,
        body: JSON.stringify({ error: "Not Found" }),
      };
    }
    if (!route.description && route.path) {
      try {
        const key = await getGoogleKey();
        const mapProvider = new GoogleMapsProvider(key);
        const updated = await describeRouteUseCase.execute(
          route.routeId,
          mapProvider
        );
        if (updated) {
          route.description = updated.description;
        }
      } catch (err) {
        console.warn("describeRoute failed:", err);
      }
    }
    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        routeId: route.routeId.Value,
        distanceKm: route.distanceKm?.Value,
        duration: route.duration?.Value,
        path: route.path?.Encoded,
        description: route.description,
      }),
    };
  }

  // GET /jobs/{jobId}/routes
  if (httpMethod === "GET" && resource === "/jobs/{jobId}/routes") {
    const jobId = pathParameters?.jobId;
    if (!jobId) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ error: "jobId parameter required" }),
      };
    }
    try {
      const list = await routeRepository.findByJobId(UUID.fromString(jobId));
      return {
        statusCode: 200,
        headers: jsonHeaders,
        body: JSON.stringify(
          list.map((r) => ({
            routeId: r.routeId.Value,
            distanceKm: r.distanceKm?.Value,
            duration: r.duration?.Value,
            path: r.path?.Encoded,
            description: r.description,
          }))
        ),
      };
    } catch (err) {
      console.error("Error listing job routes:", err);
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({ error: "Could not list routes" }),
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
          headers: jsonHeaders,
          body: JSON.stringify({ error: "Invalid JSON body" }),
        };
      }
    }

    const routeId = payload.routeId;
    if (!routeId) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ error: "routeId required" }),
      };
    }

    const ts = Date.now();
    await userActivityRepository.putRouteStart(email, routeId, ts);
    const started = await startRouteUseCase.execute({
      routeId: UUID.fromString(routeId),
      email,
      timestamp: ts,
    });
    if (!started) {
      return {
        statusCode: 404,
        headers: jsonHeaders,
        body: JSON.stringify({ error: "Not Found" }),
      };
    }
    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ ok: true }),
    };
  }

  if (resource === "/routes/{routeId}/finish" && httpMethod === "POST") {
    const routeId = pathParameters?.routeId;
    if (!routeId) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ error: "routeId parameter required" }),
      };
    }

    const finishTs = Date.now();
    const startTs = await userActivityRepository.getRouteStart(email, routeId);
    if (startTs != null) {
      await userActivityRepository.deleteRouteStart(email, routeId);
    }
    const actualDurationMs = startTs != null ? finishTs - startTs : undefined;
    const actualDuration =
      actualDurationMs != null
        ? Math.round(actualDurationMs / 1000)
        : undefined;
    const route = await finishRouteUseCase.execute({
      routeId: UUID.fromString(routeId),
      email,
      timestamp: finishTs,
      actualDuration,
    });
    if (!route) {
      return {
        statusCode: 404,
        headers: jsonHeaders,
        body: JSON.stringify({ error: "Not Found" }),
      };
    }

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        routeId: route.routeId.Value,
        distanceKm: route.distanceKm?.Value,
        duration: route.duration?.Value,
        path: route.path?.Encoded,
        description: route.description,
        ...(actualDuration != null ? { actualDuration } : {}),
      }),
    };
  }

  return {
    statusCode: 501,
    headers: jsonHeaders,
    body: JSON.stringify({ error: "Not Implemented" }),
  };
};

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
import { errorResponse } from "../../../http/error-response";
import { base } from "../../../http/base";
import { rateLimit } from "../../../http/rate-limit";
import { getGoogleKey } from "../shared/utils";
import { GoogleRoutesProvider } from "../../infrastructure/google-maps/google-routes-provider";
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
  try {
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: process.env.METRICS_QUEUE!,
        MessageBody: JSON.stringify({
          version: 1,
          event: "started",
          routeId: event.route.routeId.Value,
          email: event.email,
          timestamp: event.timestamp,
        }),
      })
    );
  } catch (err) {
    console.error("Failed to enqueue telemetry metric", err);
  }
  try {
    await publishRouteStarted(event.email, event.route.routeId.Value, 1);
  } catch (err) {
    console.error("❌ Error publishing route started:", err);
  }
});
dispatcher.subscribe("RouteFinished", async (event: RouteFinishedEvent) => {
  try {
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: process.env.METRICS_QUEUE!,
        MessageBody: JSON.stringify({
          version: 1,
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
  } catch (err) {
    console.error("Failed to enqueue telemetry metric", err);
  }
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
      }),
      1
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

export const handler = base(rateLimit(async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { httpMethod, resource, pathParameters } = event;
  const claims = (event.requestContext as any).authorizer?.claims;
  const email = claims?.email;
  if (!email) {
    return errorResponse(401, "Unauthorized");
  }
  // GET /v1/routes
  if (httpMethod === "GET" && resource === "/v1/routes") {
    try {
      const cursor = event.queryStringParameters?.cursor;
      const limitParam = event.queryStringParameters?.limit;
      const limit = limitParam ? parseInt(limitParam, 10) : undefined;
      const { items, nextCursor } = await listRoutes.execute({
        cursor,
        limit,
      });
      return {
        statusCode: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          items: items.map((r) => ({
            routeId: r.routeId.Value,
            distanceKm: r.distanceKm?.Value,
            duration: r.duration?.Value,
            path: r.path?.Encoded,
            description: r.description,
          })),
          ...(nextCursor ? { nextCursor } : {}),
        }),
      };
    } catch (err) {
      console.error("Error listing routes:", err);
      return errorResponse(500, "Could not list routes");
    }
  }

  // GET /v1/routes/{routeId}
  if (httpMethod === "GET" && resource === "/v1/routes/{routeId}") {
    const routeId = pathParameters?.routeId;
    if (!routeId) {
      return errorResponse(400, "routeId parameter required");
    }

    const route = await routeRepository.findById(UUID.fromString(routeId));
    if (!route) {
      return errorResponse(404, "Not Found");
    }
    if (!route.description && route.path) {
      try {
        const key = await getGoogleKey();
        const mapProvider = new GoogleRoutesProvider(key);
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

  // GET /v1/jobs/{jobId}/routes
  if (httpMethod === "GET" && resource === "/v1/jobs/{jobId}/routes") {
    const jobId = pathParameters?.jobId;
    if (!jobId) {
      return errorResponse(400, "jobId parameter required");
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
      return errorResponse(500, "Could not list routes");
    }
  }

  if (resource === "/v1/telemetry/started" && httpMethod === "POST") {
    let payload: any = {};
    if (event.body) {
      try {
        payload = JSON.parse(event.body);
      } catch {
        return errorResponse(400, "Invalid JSON body");
      }
    }

    const routeId = payload.routeId;
    if (!routeId) {
      return errorResponse(400, "routeId required");
    }

    const ts = Date.now();
    await userActivityRepository.putActiveRoute(email, routeId, ts);
    const started = await startRouteUseCase.execute({
      routeId: UUID.fromString(routeId),
      email,
      timestamp: ts,
    });
    if (!started) {
      return errorResponse(404, "Not Found");
    }
    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ ok: true }),
    };
  }

    if (resource === "/v1/routes/{routeId}/finish" && httpMethod === "POST") {
      const routeId = pathParameters?.routeId;
      if (!routeId) {
        return errorResponse(400, "routeId parameter required");
      }

      const route = await routeRepository.findById(UUID.fromString(routeId));
      if (!route) {
        return errorResponse(404, "Not Found");
      }

      const active = await userActivityRepository.getActiveRoute(email, routeId);
      if (!active) {
        return errorResponse(409, "Route not active");
      }

      const finishTs = Date.now();
      await userActivityRepository.deleteActiveRoute(email, routeId);
      const actualDurationMs = finishTs - active.startedAt;
      const actualDuration = Math.round(actualDurationMs / 1000);
      const routeFinished = await finishRouteUseCase.execute({
        routeId: UUID.fromString(routeId),
        email,
        timestamp: finishTs,
        actualDuration,
      });
      const finalRoute = routeFinished ?? route;

      return {
        statusCode: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          routeId: finalRoute.routeId.Value,
          distanceKm: finalRoute.distanceKm?.Value,
          duration: finalRoute.duration?.Value,
          path: finalRoute.path?.Encoded,
          description: finalRoute.description,
          ...(actualDuration != null ? { actualDuration } : {}),
        }),
      };
    }

  return errorResponse(501, "Not Implemented");
}));

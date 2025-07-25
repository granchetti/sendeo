import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { DynamoRouteRepository } from "../../infrastructure/dynamodb/dynamo-route-repository";
import { DynamoUserStateRepository } from "../../../users/infrastructure/dynamodb/dynamo-user-state-repository";
import { publishRouteStarted, publishRouteFinished } from "../appsync-client";
import { UUID } from "../../domain/value-objects/uuid-value-object";
import { ListRoutesUseCase } from "../../application/use-cases/list-routes";
import { GetRouteDetailsUseCase } from "../../application/use-cases/get-route-details";
import { corsHeaders } from "../../../http/cors";

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

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { httpMethod, resource, pathParameters } = event;
  const email = (event.requestContext as any).authorizer?.claims?.email;
  if (!email) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: "Unauthorized" }) };
  }
  // GET /routes
  if (httpMethod === "GET" && resource === "/routes") {
    try {
      const all = await listRoutes.execute();
      return {
        statusCode: 200,
        headers: corsHeaders,
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
        headers: corsHeaders,
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
        headers: corsHeaders,
        body: JSON.stringify({ error: "routeId parameter required" }),
      };
    }

    const route = await getRouteDetails.execute(UUID.fromString(routeId));
    if (!route) {
      return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: "Not Found" }) };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
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
        headers: corsHeaders,
        body: JSON.stringify({ error: "jobId parameter required" }),
      };
    }
    try {
      const list = await routeRepository.findByJobId(jobId);
      return {
        statusCode: 200,
        headers: corsHeaders,
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
        headers: corsHeaders,
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
          headers: corsHeaders,
          body: JSON.stringify({ error: "Invalid JSON body" }),
        };
      }
    }

    const routeId = payload.routeId;
    if (!routeId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "routeId required" }),
      };
    }

    const ts = Date.now();
    await userStateRepository.putRouteStart(email, routeId, ts);
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: process.env.METRICS_QUEUE!,
        MessageBody: JSON.stringify({
          event: "started",
          routeId,
          email,
          timestamp: ts,
        }),
      })
    );

    try {
      await publishRouteStarted(email, routeId);
    } catch (err) {
      console.error("❌ Error publishing route started:", err);
    }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true }) };
  }

  if (resource === "/routes/{routeId}/finish" && httpMethod === "POST") {
    const routeId = pathParameters?.routeId;
    if (!routeId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "routeId parameter required" }),
      };
    }

    const route = await getRouteDetails.execute(UUID.fromString(routeId));
    if (!route) {
      return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: "Not Found" }) };
    }

    const finishTs = Date.now();
    const startTs = await userStateRepository.getRouteStart(email, routeId);
    if (startTs != null) {
      await userStateRepository.deleteRouteStart(email, routeId);
    }
    const actualDurationMs = startTs != null ? finishTs - startTs : undefined;
    const actualDuration =
      actualDurationMs != null
        ? Math.round(actualDurationMs / 1000)
        : undefined;

    await sqs.send(
      new SendMessageCommand({
        QueueUrl: process.env.METRICS_QUEUE!,
        MessageBody: JSON.stringify({
          event: "finished",
          routeId,
          email,
          timestamp: finishTs,
          ...(actualDuration != null ? { actualDuration } : {}),
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
          ...(actualDuration != null ? { actualDuration } : {}),
        })
      );
    } catch (err) {
      console.error("❌ Error publishing route finished:", err);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        routeId: route.routeId.Value,
        distanceKm: route.distanceKm?.Value,
        duration: route.duration?.Value,
        path: route.path?.Encoded,
        ...(actualDuration != null ? { actualDuration } : {}),
      }),
    };
  }

  return {
    statusCode: 501,
    headers: corsHeaders,
    body: JSON.stringify({ error: "Not Implemented" }),
  };
};

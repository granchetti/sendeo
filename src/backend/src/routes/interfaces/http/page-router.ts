import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoRouteRepository } from "../../infrastructure/dynamodb/dynamo-route-repository";

const dynamo = new DynamoDBClient({});
const repository = new DynamoRouteRepository(dynamo, process.env.ROUTES_TABLE!);

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { httpMethod, resource, pathParameters } = event;

    // GET /routes
  if (httpMethod === "GET" && resource === "/routes") {
    try {
      const all = await repository.findAll();
      return {
        statusCode: 200,
        body: JSON.stringify(
          all.map(r => ({
            routeId:   r.routeId.Value,
            distance:  r.distanceKm?.Value,
            duration:  r.duration?.Value,
            path:      r.path?.Encoded,
          }))
        ),
      };
    } catch (err) {
      console.error("Error listing routes:", err);
      return { statusCode: 500, body: JSON.stringify({ error: "Could not list routes" }) };
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

    const route = await repository.findById(routeId);
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

  if (resource === "/profile" && httpMethod === "GET") {
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  if (resource === "/profile" && httpMethod === "PUT") {
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  if (resource === "/favourites" && httpMethod === "GET") {
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  if (resource === "/telemetry/started" && httpMethod === "POST") {
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  if (resource === "/routes/{routeId}/finish" && httpMethod === "POST") {
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 501, body: JSON.stringify({ error: "Not Implemented" }) };
};
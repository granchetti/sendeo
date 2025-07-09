import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoRouteRepository } from "../../infrastructure/dynamodb/dynamo-route-repository";
import { DynamoUserStateRepository } from "../../infrastructure/dynamodb/dynamo-user-state-repository";
import { UUID } from "../../domain/value-objects/uuid-value-object";
import { ListRoutesUseCase } from "../../application/use-cases/list-routes";
import { GetRouteDetailsUseCase } from "../../application/use-cases/get-route-details";

const dynamo = new DynamoDBClient({});
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
    const profile = await userStateRepository.getProfile(email);
    if (!profile) {
      return { statusCode: 404, body: JSON.stringify({ error: "Not Found" }) };
    }
    return { statusCode: 200, body: JSON.stringify(profile) };
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
    const profile = {
      email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      displayName: payload.displayName,
      age: payload.age != null ? Number(payload.age) : undefined,
      unit: payload.unit,
    };
    await userStateRepository.putProfile(profile);
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
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  if (resource === "/routes/{routeId}/finish" && httpMethod === "POST") {
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  return {
    statusCode: 501,
    body: JSON.stringify({ error: "Not Implemented" }),
  };
};

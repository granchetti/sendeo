// src/routes/interfaces/http/page-router.test.ts

// 1) Mocks (antes de importar handler)
const mockFindById = jest.fn();
const mockFindAll = jest.fn();
const mockGetFavourites = jest.fn();

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("../../infrastructure/dynamodb/dynamo-route-repository", () => ({
  DynamoRouteRepository: jest.fn().mockImplementation(() => ({
    findById: mockFindById,
    findAll: mockFindAll,
  })),
}));

jest.mock("../../infrastructure/dynamodb/dynamo-user-state-repository", () => ({
  DynamoUserStateRepository: jest.fn().mockImplementation(() => ({
    getFavourites: mockGetFavourites,
  })),
}));

import { handler } from "./page-router";
import { Route } from "../../domain/entities/route-entity";
import { RouteId } from "../../domain/value-objects/route-id-value-object";
import { DistanceKm } from "../../domain/value-objects/distance-value-object";
import { Duration } from "../../domain/value-objects/duration-value-object";
import { Path } from "../../domain/value-objects/path-value-object";

const baseCtx = {
  requestContext: {
    authorizer: { claims: { email: "test@example.com" } },
  },
} as any;

beforeEach(() => {
  mockFindById.mockReset();
  mockFindAll.mockReset();
  mockGetFavourites.mockReset();
});

describe("page router get route", () => {
  const baseEvent = {
    ...baseCtx,
    resource: "/routes/{routeId}",
    httpMethod: "GET",
  } as any;

  it("returns 400 when path parameter missing", async () => {
    const res = await handler(baseEvent);
    expect(res.statusCode).toBe(400);
  });

  it("returns 404 when route not found", async () => {
    mockFindById.mockResolvedValueOnce(null);
    const res = await handler({
      ...baseEvent,
      pathParameters: { routeId: "1" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns route when found", async () => {
    const route = new Route({
      routeId: RouteId.generate(),
      distanceKm: new DistanceKm(2),
      duration: new Duration(100),
      path: Path.fromCoordinates([
        { lat: 0, lng: 0 },
        { lat: 1, lng: 1 },
      ]),
    });
    mockFindById.mockResolvedValueOnce(route);

    const res = await handler({
      ...baseEvent,
      pathParameters: { routeId: route.routeId.Value },
    });

    expect(mockFindById).toHaveBeenCalledWith(route.routeId.Value);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toEqual({
      routeId: route.routeId.Value,
      distanceKm: 2,
      duration: 100,
      path: route.path!.Encoded,
    });
  });
});

describe("page router list routes", () => {
  const baseEvent = {
    ...baseCtx,
    resource: "/routes",
    httpMethod: "GET",
  } as any;

  it("returns 200 and empty array when no routes exist", async () => {
    mockFindAll.mockResolvedValueOnce([]);
    const res = await handler(baseEvent);
    expect(mockFindAll).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  it("returns 200 and list of routes when routes exist", async () => {
    const route1 = new Route({
      routeId: RouteId.generate(),
      distanceKm: new DistanceKm(1),
      duration: new Duration(10),
      path: Path.fromCoordinates([
        { lat: 10, lng: 10 },
        { lat: 20, lng: 20 },
      ]),
    });
    const route2 = new Route({
      routeId: RouteId.generate(),
      distanceKm: new DistanceKm(2),
      duration: new Duration(20),
      path: Path.fromCoordinates([
        { lat: 30, lng: 30 },
        { lat: 40, lng: 40 },
      ]),
    });
    mockFindAll.mockResolvedValueOnce([route1, route2]);

    const res = await handler(baseEvent);

    expect(mockFindAll).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body);
    expect(body).toEqual([
      {
        routeId: route1.routeId.Value,
        distanceKm: 1,
        duration: 10,
        path: route1.path!.Encoded,
      },
      {
        routeId: route2.routeId.Value,
        distanceKm: 2,
        duration: 20,
        path: route2.path!.Encoded,
      },
    ]);
  });
});

describe("page router get favourites", () => {
  const baseEvent = {
    ...baseCtx, // <— y aquí
    resource: "/favourites",
    httpMethod: "GET",
  } as any;

  it("returns list of favourites on GET", async () => {
    mockGetFavourites.mockResolvedValueOnce(["FAV#1", "FAV#2"]);
    const res = await handler(baseEvent);
    expect(mockGetFavourites).toHaveBeenCalledWith("test@example.com");
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toEqual({ favourites: ["1", "2"] });
  });
});

// … resto de tests para profile, telemetry, finish, etc. …

const mockFindById = jest.fn();

jest.mock(
  "../../infrastructure/dynamodb/dynamo-route-repository",
  () => ({
    DynamoRouteRepository: jest
      .fn()
      .mockImplementation(() => ({ findById: mockFindById })),
  })
);

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));

import { handler } from "./page-router";
import { Route } from "../../domain/entities/route-entity";
import { RouteId } from "../../domain/value-objects/route-id-value-object";
import { DistanceKm } from "../../domain/value-objects/distance-value-object";
import { Duration } from "../../domain/value-objects/duration-value-object";
import { Path } from "../../domain/value-objects/path-value-object";

beforeEach(() => {
  mockFindById.mockReset();
});

describe("page router get route", () => {
  const baseEvent = {
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

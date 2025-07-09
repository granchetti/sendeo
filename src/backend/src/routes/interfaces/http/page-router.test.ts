const mockFindById = jest.fn();
const mockFindAll = jest.fn();
const mockFindByJobId = jest.fn();
const mockGetFavourites = jest.fn();
const mockPutRouteStart = jest.fn();
const mockGetRouteStart = jest.fn();
const mockDeleteRouteStart = jest.fn();
let mockSend: jest.Mock;
const mockPublishStarted = jest.fn();
const mockPublishFinished = jest.fn();

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("../../infrastructure/dynamodb/dynamo-route-repository", () => ({
  DynamoRouteRepository: jest.fn().mockImplementation(() => ({
    findById: mockFindById,
    findAll: mockFindAll,
    findByJobId: mockFindByJobId,
  })),
}));

jest.mock("../../../users/infrastructure/dynamodb/dynamo-user-state-repository", () => ({
  DynamoUserStateRepository: jest.fn().mockImplementation(() => ({
    getFavourites: mockGetFavourites,
    putRouteStart: (...args: any[]) => mockPutRouteStart(...args),
    getRouteStart: (...args: any[]) => mockGetRouteStart(...args),
    deleteRouteStart: (...args: any[]) => mockDeleteRouteStart(...args),
  })),
}));

jest.mock("@aws-sdk/client-sqs", () => {
  mockSend = jest.fn();
  return {
    SQSClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
    SendMessageCommand: jest.fn().mockImplementation((input) => input),
  };
});

jest.mock("../appsync-client", () => ({
  publishRouteStarted: (...args: any[]) => mockPublishStarted(...args),
  publishRouteFinished: (...args: any[]) => mockPublishFinished(...args),
}));

import { handler } from "./page-router";
import { Route } from "../../domain/entities/route-entity";
import { UUID } from "../../domain/value-objects/uuid-value-object";
import { DistanceKm } from "../../domain/value-objects/distance-value-object";
import { Duration } from "../../domain/value-objects/duration-value-object";
import { Path } from "../../domain/value-objects/path-value-object";
import { LatLng } from "../../domain/value-objects/lat-lng-value-object";

const baseCtx = {
  requestContext: {
    authorizer: { claims: { email: "test@example.com" } },
  },
} as any;

beforeEach(() => {
  mockFindById.mockReset();
  mockFindAll.mockReset();
  mockFindByJobId.mockReset();
  mockGetFavourites.mockReset();
  mockPutRouteStart.mockReset();
  mockGetRouteStart.mockReset();
  mockDeleteRouteStart.mockReset();
  mockSend.mockReset();
  mockPublishStarted.mockReset();
  mockPublishFinished.mockReset();
  process.env.METRICS_QUEUE = "http://localhost";
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
    const missingId = UUID.generate();
    mockFindById.mockResolvedValueOnce(null);
    const res = await handler({
      ...baseEvent,
      pathParameters: { routeId: missingId.Value },
    });
    expect(mockFindById).toHaveBeenCalledWith(missingId);
    expect(res.statusCode).toBe(404);
  });

  it("returns route when found", async () => {
    const route = new Route({
      routeId: UUID.generate(),
      distanceKm: new DistanceKm(2),
      duration: new Duration(100),
      path: Path.fromCoordinates([
        LatLng.fromNumbers(0, 0),
        LatLng.fromNumbers(1, 1),
      ]),
    });
    mockFindById.mockResolvedValueOnce(route);

    const res = await handler({
      ...baseEvent,
      pathParameters: { routeId: route.routeId.Value },
    });

    expect(mockFindById).toHaveBeenCalledWith(route.routeId);
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
      routeId: UUID.generate(),
      distanceKm: new DistanceKm(1),
      duration: new Duration(10),
      path: Path.fromCoordinates([
        LatLng.fromNumbers(10, 10),
        LatLng.fromNumbers(20, 20),
      ]),
    });
    const route2 = new Route({
      routeId: UUID.generate(),
      distanceKm: new DistanceKm(2),
      duration: new Duration(20),
      path: Path.fromCoordinates([
        LatLng.fromNumbers(30, 30),
        LatLng.fromNumbers(40, 40),
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


describe("page router list routes by jobId", () => {
  const baseEvent = {
    ...baseCtx,
    resource: "/jobs/{jobId}/routes",
    httpMethod: "GET",
  } as any;

  it("returns 400 when jobId missing", async () => {
    const res = await handler(baseEvent);
    expect(res.statusCode).toBe(400);
  });

  it("returns list of routes for job", async () => {
    const jobId = UUID.generate()
    const r = new Route({ routeId: UUID.generate(), jobId });
    mockFindByJobId.mockResolvedValueOnce([r]);
    const res = await handler({
      ...baseEvent,
      pathParameters: { jobId: jobId.Value },
    });
    expect(mockFindByJobId).toHaveBeenCalledWith(jobId.Value);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual([
      { routeId: r.routeId.Value, distanceKm: undefined, duration: undefined, path: undefined },
    ]);
  });
});


describe("telemetry started", () => {
  const baseEvent = {
    ...baseCtx,
    resource: "/telemetry/started",
    httpMethod: "POST",
  } as any;

  it("returns 400 on invalid body", async () => {
    const res = await handler({ ...baseEvent, body: "{" });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 when routeId missing", async () => {
    const res = await handler({ ...baseEvent, body: "{}" });
    expect(res.statusCode).toBe(400);
  });

  it("enqueues started metric", async () => {
    mockSend.mockResolvedValueOnce({});
    const routeId = UUID.generate().Value
    const res = await handler({
      ...baseEvent,
      body: JSON.stringify({ routeId }),
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockPutRouteStart).toHaveBeenCalledWith(
      "test@example.com",
      routeId,
      expect.any(Number)
    );
    const sent = mockSend.mock.calls[0][0];
    const payload = JSON.parse(sent.MessageBody);
    expect(payload).toMatchObject({
      event: "started",
      routeId,
      email: "test@example.com",
    });
    expect(mockPublishStarted).toHaveBeenCalledWith("test@example.com", routeId);
    expect(res.statusCode).toBe(200);
  });
});

describe("finish route", () => {
  const baseEvent = {
    ...baseCtx,
    resource: "/routes/{routeId}/finish",
    httpMethod: "POST",
  } as any;

  it("returns 400 when routeId param missing", async () => {
    const res = await handler(baseEvent);
    expect(res.statusCode).toBe(400);
  });

  it("returns 404 when route not found", async () => {
    mockFindById.mockResolvedValueOnce(null);
    const res = await handler({
      ...baseEvent,
      pathParameters: { routeId: 'a28f07d1-d0f3-4c1a-b2e4-8e31b6f0e84a' },
    });
    expect(res.statusCode).toBe(404);
  });

  it("sends finish metric and returns route", async () => {
    const route = new Route({
      routeId: UUID.generate(),
      distanceKm: new DistanceKm(2),
      duration: new Duration(100),
      path: Path.fromCoordinates([
        LatLng.fromNumbers(0, 0),
        LatLng.fromNumbers(1, 1),
      ]),
    });
    mockFindById.mockResolvedValueOnce(route);
    mockGetRouteStart.mockResolvedValueOnce(1000);
    mockSend.mockResolvedValueOnce({});

    const res = await handler({
      ...baseEvent,
      pathParameters: { routeId: route.routeId.Value },
    });

    expect(mockGetRouteStart).toHaveBeenCalledWith(
      "test@example.com",
      route.routeId.Value
    );
    expect(mockDeleteRouteStart).toHaveBeenCalledWith(
      "test@example.com",
      route.routeId.Value
    );
    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(mockSend.mock.calls[0][0].MessageBody);
    expect(payload.routeId).toBe(route.routeId.Value);
    expect(payload.event).toBe("finished");
    expect(payload).toHaveProperty("actualDuration");
    expect(mockPublishFinished).toHaveBeenCalledWith(
      "test@example.com",
      route.routeId.Value,
      expect.any(String)
    );
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toEqual({
      routeId: route.routeId.Value,
      distanceKm: 2,
      duration: 100,
      path: route.path!.Encoded,
      actualDuration: expect.any(Number),
    });
  });
});

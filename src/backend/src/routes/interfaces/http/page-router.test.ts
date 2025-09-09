const mockFindById = jest.fn();
const mockFindAll = jest.fn();
const mockFindByJobId = jest.fn();
const mockSave = jest.fn();
const mockPutActiveRoute = jest.fn();
const mockGetActiveRoute = jest.fn();
const mockDeleteActiveRoute = jest.fn();
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
    save: mockSave,
  })),
}));

jest.mock(
  "../../../users/infrastructure/dynamodb/dynamo-user-activity-repository",
  () => ({
    DynamoUserActivityRepository: jest.fn().mockImplementation(() => ({
      putActiveRoute: (...args: any[]) => mockPutActiveRoute(...args),
      getActiveRoute: (...args: any[]) => mockGetActiveRoute(...args),
      deleteActiveRoute: (...args: any[]) => mockDeleteActiveRoute(...args),
    })),
  })
);

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
import { Route } from "../../domain/entities/route";
import { UUID } from "../../../shared/domain/value-objects/uuid";
import { DistanceKm } from "../../domain/value-objects/distance";
import { Duration } from "../../domain/value-objects/duration";
import { Path } from "../../domain/value-objects/path";
import { LatLng } from "../../domain/value-objects/lat-lng";
const baseCtx = {
  requestContext: {
    authorizer: { claims: { email: "test@example.com" } },
  },
  headers: { Accept: "application/json" },
} as any;

beforeEach(() => {
  mockFindById.mockReset();
  mockFindAll.mockReset();
  mockFindByJobId.mockReset();
  mockSave.mockReset();
  mockPutActiveRoute.mockReset();
  mockGetActiveRoute.mockReset();
  mockDeleteActiveRoute.mockReset();
  mockSend.mockReset();
  mockPublishStarted.mockReset();
  mockPublishFinished.mockReset();
  process.env.METRICS_QUEUE = "http://localhost";
});

describe("page router get route", () => {
  const baseEvent = {
    ...baseCtx,
    resource: "/v1/routes/{routeId}",
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
    const route = Route.request({ routeId: UUID.generate() });
    route.generate(
      new DistanceKm(2),
      new Duration(100),
      Path.fromCoordinates([LatLng.fromNumbers(0, 0), LatLng.fromNumbers(1, 1)])
    );
    route.description = "desc";
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
      description: "desc",
    });
  });
});

describe("page router list routes", () => {
  const baseEvent = {
    ...baseCtx,
    resource: "/v1/routes",
    httpMethod: "GET",
  } as any;

  it("returns 200 and empty array when no routes exist", async () => {
    mockFindAll.mockResolvedValueOnce({ items: [] });
    const res = await handler(baseEvent);
    expect(mockFindAll).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toEqual({ items: [] });
  });

  it("returns 200 and list of routes when routes exist", async () => {
    const route1 = Route.request({ routeId: UUID.generate() });
    route1.generate(
      new DistanceKm(1),
      new Duration(10),
      Path.fromCoordinates([
        LatLng.fromNumbers(10, 10),
        LatLng.fromNumbers(20, 20),
      ])
    );
    route1.description = "a";
    const route2 = Route.request({ routeId: UUID.generate() });
    route2.generate(
      new DistanceKm(2),
      new Duration(20),
      Path.fromCoordinates([
        LatLng.fromNumbers(30, 30),
        LatLng.fromNumbers(40, 40),
      ])
    );
    route2.description = "b";
    mockFindAll.mockResolvedValueOnce({ items: [route1, route2] });

    const res = await handler(baseEvent);

    expect(mockFindAll).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body);
    expect(body).toEqual({
      items: [
        {
          routeId: route1.routeId.Value,
          distanceKm: 1,
          duration: 10,
          path: route1.path!.Encoded,
          description: "a",
        },
        {
          routeId: route2.routeId.Value,
          distanceKm: 2,
          duration: 20,
          path: route2.path!.Encoded,
          description: "b",
        },
      ],
    });
  });

  it("passes cursor and limit and returns nextCursor", async () => {
    const route = Route.request({ routeId: UUID.generate() });
    mockFindAll.mockResolvedValueOnce({ items: [route], nextCursor: "n1" });
    const res = await handler({
      ...baseEvent,
      queryStringParameters: { cursor: "c0", limit: "1" },
    });
    expect(mockFindAll).toHaveBeenCalledWith({ cursor: "c0", limit: 1 });
    const body = JSON.parse(res.body);
    expect(body).toEqual({
      items: [
        {
          routeId: route.routeId.Value,
          distanceKm: undefined,
          duration: undefined,
          path: undefined,
          description: undefined,
        },
      ],
      nextCursor: "n1",
    });
  });
});

describe("page router list routes by jobId", () => {
  const baseEvent = {
    ...baseCtx,
    resource: "/v1/jobs/{jobId}/routes",
    httpMethod: "GET",
  } as any;

  it("returns 400 when jobId missing", async () => {
    const res = await handler(baseEvent);
    expect(res.statusCode).toBe(400);
  });

  it("returns list of routes for job", async () => {
    const jobId = UUID.generate();
    const r = Route.request({ routeId: UUID.generate(), jobId });
    mockFindByJobId.mockResolvedValueOnce([r]);
    const res = await handler({
      ...baseEvent,
      pathParameters: { jobId: jobId.Value },
    });
    expect(mockFindByJobId).toHaveBeenCalledWith(jobId);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual([
      {
        routeId: r.routeId.Value,
        distanceKm: undefined,
        duration: undefined,
        path: undefined,
        description: undefined,
      },
    ]);
  });
});

describe("telemetry started", () => {
  const baseEvent = {
    ...baseCtx,
    resource: "/v1/telemetry/started",
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
    const route = Route.request({ routeId: UUID.generate() });
    route.generate(
      new DistanceKm(1),
      new Duration(10),
      Path.fromCoordinates([LatLng.fromNumbers(0, 0), LatLng.fromNumbers(1, 1)])
    );
    mockFindById.mockResolvedValueOnce(route);
    const routeId = route.routeId.Value;
    const res = await handler({
      ...baseEvent,
      body: JSON.stringify({ routeId }),
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledWith(route);
    expect(mockPutActiveRoute).toHaveBeenCalledWith(
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
    expect(mockPublishStarted).toHaveBeenCalledWith(
      "test@example.com",
      routeId
    );
    expect(res.statusCode).toBe(200);
  });

  it("continues when metric enqueue fails", async () => {
    mockSend.mockRejectedValueOnce(new Error("boom"));
    const route = Route.request({ routeId: UUID.generate() });
    route.generate(
      new DistanceKm(1),
      new Duration(10),
      Path.fromCoordinates([LatLng.fromNumbers(0, 0), LatLng.fromNumbers(1, 1)])
    );
    mockFindById.mockResolvedValueOnce(route);
    const routeId = route.routeId.Value;
    const res = await handler({
      ...baseEvent,
      body: JSON.stringify({ routeId }),
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockPublishStarted).toHaveBeenCalledWith(
      "test@example.com",
      routeId
    );
    expect(res.statusCode).toBe(200);
  });
});

describe("finish route", () => {
  const baseEvent = {
    ...baseCtx,
    resource: "/v1/routes/{routeId}/finish",
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
      pathParameters: { routeId: "a28f07d1-d0f3-4c1a-b2e4-8e31b6f0e84a" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("sends finish metric and returns route", async () => {
    const route = Route.request({ routeId: UUID.generate() });
    route.generate(
      new DistanceKm(2),
      new Duration(100),
      Path.fromCoordinates([LatLng.fromNumbers(0, 0), LatLng.fromNumbers(1, 1)])
    );
    route.description = "desc";
    route.start();
    mockFindById.mockResolvedValueOnce(route);
    mockGetActiveRoute.mockResolvedValueOnce({ startedAt: 1000 });
    mockSend.mockResolvedValueOnce({});

    const res = await handler({
      ...baseEvent,
      pathParameters: { routeId: route.routeId.Value },
    });

    expect(mockGetActiveRoute).toHaveBeenCalledWith(
      "test@example.com",
      route.routeId.Value
    );
    expect(mockDeleteActiveRoute).toHaveBeenCalledWith(
      "test@example.com",
      route.routeId.Value
    );
    expect(mockSave).toHaveBeenCalledWith(route);
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
    const summary = JSON.parse(mockPublishFinished.mock.calls[0][2]);
    expect(summary.description).toBe("desc");
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toEqual({
      routeId: route.routeId.Value,
      distanceKm: 2,
      duration: 100,
      path: route.path!.Encoded,
      description: "desc",
      actualDuration: expect.any(Number),
    });
  });

  it("returns route even if metric enqueue fails", async () => {
    const route = Route.request({ routeId: UUID.generate() });
    route.generate(
      new DistanceKm(2),
      new Duration(100),
      Path.fromCoordinates([LatLng.fromNumbers(0, 0), LatLng.fromNumbers(1, 1)])
    );
    route.description = "desc";
    route.start();
    mockFindById.mockResolvedValueOnce(route);
    mockGetActiveRoute.mockResolvedValueOnce({ startedAt: 1000 });
    mockSend.mockRejectedValueOnce(new Error("boom"));

    const res = await handler({
      ...baseEvent,
      pathParameters: { routeId: route.routeId.Value },
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockPublishFinished).toHaveBeenCalledWith(
      "test@example.com",
      route.routeId.Value,
      expect.any(String)
    );
    expect(res.statusCode).toBe(200);
  });
});

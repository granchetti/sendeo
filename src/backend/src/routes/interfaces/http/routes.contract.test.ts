const mockFindById = jest.fn();
const mockFindAll = jest.fn();
let mockSend: jest.Mock;

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("../../infrastructure/dynamodb/dynamo-route-repository", () => ({
  DynamoRouteRepository: jest.fn().mockImplementation(() => ({
    findById: (...args: any[]) => mockFindById(...args),
    findAll: (...args: any[]) => mockFindAll(...args),
    findByJobId: jest.fn(),
    save: jest.fn(),
  })),
}));

jest.mock("../../../users/infrastructure/dynamodb/dynamo-user-activity-repository", () => ({
  DynamoUserActivityRepository: jest
    .fn()
    .mockImplementation(() => ({
      putActiveRoute: jest.fn(),
      getActiveRoute: jest.fn(),
      deleteActiveRoute: jest.fn(),
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
  publishRouteStarted: jest.fn(),
  publishRouteFinished: jest.fn(),
}));

import { handler } from "./page-router";

const baseCtx = {
  requestContext: { authorizer: { claims: { email: "test@example.com" } } },
  headers: { Accept: "application/json" },
} as any;

beforeEach(() => {
  mockFindById.mockReset();
  mockFindAll.mockReset();
  process.env.METRICS_QUEUE = "http://localhost";
});

describe("routes contract", () => {
  describe("GET /v1/routes", () => {
    const baseEvent = {
      ...baseCtx,
      resource: "/v1/routes",
      httpMethod: "GET",
    } as any;

    it("returns list of routes on success", async () => {
      mockFindAll.mockResolvedValueOnce({
        items: [
          {
            routeId: { Value: "r1" },
            distanceKm: { Value: 1 },
            duration: { Value: 10 },
            path: { Encoded: "e" },
            description: "d",
          },
        ],
      });

      const res = await handler(baseEvent);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({
        items: [
          {
            routeId: "r1",
            distanceKm: 1,
            duration: 10,
            path: "e",
            description: "d",
          },
        ],
      });
    });

    it("returns 401 when unauthorized", async () => {
      const res = await handler({ ...baseEvent, requestContext: {} } as any);
      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body)).toMatchObject({
        code: 401,
        message: "Unauthorized",
      });
    });
  });

  describe("GET /v1/routes/{routeId}", () => {
    const baseEvent = {
      ...baseCtx,
      resource: "/v1/routes/{routeId}",
      httpMethod: "GET",
    } as any;

    it("returns route when found", async () => {
      const rid = "a28f07d1-d0f3-4c1a-b2e4-8e31b6f0e84a";
      mockFindById.mockResolvedValueOnce({
        routeId: { Value: rid },
        distanceKm: { Value: 1 },
        duration: { Value: 10 },
        path: { Encoded: "e" },
        description: "d",
      });
      const res = await handler({
        ...baseEvent,
        pathParameters: { routeId: rid },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({
        routeId: rid,
        distanceKm: 1,
        duration: 10,
        path: "e",
        description: "d",
      });
    });

    it("returns 404 when route is missing", async () => {
      const rid = "b28f07d1-d0f3-4c1a-b2e4-8e31b6f0e84b";
      mockFindById.mockResolvedValueOnce(null);
      const res = await handler({
        ...baseEvent,
        pathParameters: { routeId: rid },
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body)).toMatchObject({
        code: 404,
        message: "Not Found",
      });
    });
  });
});


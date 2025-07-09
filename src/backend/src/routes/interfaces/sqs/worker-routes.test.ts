import { EventEmitter } from "events";

const mockSave = jest.fn();

jest.mock("../../infrastructure/dynamodb/dynamo-route-repository", () => ({
  DynamoRouteRepository: jest
    .fn()
    .mockImplementation(() => ({ save: mockSave })),
}));

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));

const mockPublish = jest.fn();
jest.mock("../appsync-client", () => ({
  publishRoutesGenerated: (...args: any[]) => mockPublish(...args),
}));

const responseDataHolder: { data: string } = { data: "" };
const httpsRequest = jest.fn((opts: string | any, cb: (res: any) => void) => {
  const res = new EventEmitter();
  res.on = res.addListener;
  cb(res);
  return {
    on: jest.fn(),
    write: jest.fn(),
    end: jest.fn(() => {
      const payload =
        typeof opts === "string"
          ? JSON.stringify({
              results: [
                {
                  geometry: {
                    location: { lat: 0, lng: 0 },
                  },
                },
              ],
            })
          : responseDataHolder.data;
      res.emit("data", payload);
      res.emit("end");
    }),
  };
});

jest.mock("node:https", () => ({ request: httpsRequest }));

describe("worker routes handler", () => {
  beforeEach(() => {
    jest.resetModules();
    mockSave.mockReset();
    httpsRequest.mockClear();
    mockPublish.mockReset();
    process.env.ROUTES_TABLE = "t";
    process.env.GOOGLE_API_KEY = "k";
  });

  function loadHandler() {
    return require("./worker-routes").handler as any;
  }

  it("saves decoded route when directions are returned", async () => {
    responseDataHolder.data = JSON.stringify({
      routes: [
        {
          legs: [
            {
              distanceMeters: 1500,
              duration: { seconds: 600 },
              polyline: {
                encodedPolyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
              },
            },
          ],
        },
      ],
    });

    const handler = loadHandler();
    const event = {
      Records: [
        {
          body: JSON.stringify({
            jobId: "550e8400-e29b-41d4-a716-446655440000",
            origin: "a",
            destination: "b",
            routesCount: 1,
          }),
        },
      ],
    };

    await handler(event);

    const routeCalls = httpsRequest.mock.calls.filter(
      ([opts]) =>
        typeof opts === "object" &&
        (opts as any).host === "routes.googleapis.com"
    );
    expect(routeCalls).toHaveLength(1);

    expect(mockSave).toHaveBeenCalledTimes(1);
    const saved = mockSave.mock.calls[0][0];

    expect(saved.distanceKm.Value).toBe(1.5);
    expect(saved.duration.Value).toBe(600);
    expect(
      saved.path!.Coordinates.map((c) => ({ lat: c.Lat, lng: c.Lng }))
    ).toEqual([
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ]);

    expect(mockPublish).toHaveBeenCalledWith(
      "550e8400-e29b-41d4-a716-446655440000",
      [saved]
    );
  });

  it("does not save when response has no legs", async () => {
    responseDataHolder.data = JSON.stringify({
      routes: [{ legs: [] }],
    });

    const handler = loadHandler();
    const event = {
      Records: [
        {
          body: JSON.stringify({
            jobId: "550e8400-e29b-41d4-a716-446655440001",
            origin: "a",
            destination: "b",
            routesCount: 1,
          }),
        },
      ],
    };

    await handler(event);

    const routeCalls = httpsRequest.mock.calls.filter(
      ([opts]) =>
        typeof opts === "object" &&
        (opts as any).host === "routes.googleapis.com"
    );
    expect(routeCalls).toHaveLength(1);
    expect(mockSave).not.toHaveBeenCalled();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it("saves route when no encoded polyline is returned", async () => {
    responseDataHolder.data = JSON.stringify({
      routes: [
        {
          legs: [
            {
              distanceMeters: 1500,
              duration: { seconds: 600 },
              polyline: {},
            },
          ],
        },
      ],
    });

    const handler = loadHandler();
    const event = {
      Records: [
        {
          body: JSON.stringify({
            jobId: "550e8400-e29b-41d4-a716-446655440002",
            origin: "a",
            destination: "b",
            routesCount: 1,
          }),
        },
      ],
    } as any;

    await handler(event);

    const saved = mockSave.mock.calls[0][0];
    expect(saved.path).toBeUndefined();
  });

  it("generates round trip when distanceKm provided", async () => {
    responseDataHolder.data = JSON.stringify({
      routes: [
        {
          legs: [
            {
              distanceMeters: 1500,
              duration: { seconds: 600 },
              polyline: {
                encodedPolyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
              },
            },
          ],
        },
      ],
    });

    const handler = loadHandler();
    const event = {
      Records: [
        {
          body: JSON.stringify({
            jobId: "550e8400-e29b-41d4-a716-446655440003",
            origin: "a",
            distanceKm: 3,
            roundTrip: true,
            routesCount: 1,
          }),
        },
      ],
    } as any;

    await handler(event);

    const routeCalls = httpsRequest.mock.calls.filter(
      ([opts]) =>
        typeof opts === "object" &&
        (opts as any).host === "routes.googleapis.com"
    );
    expect(routeCalls).toHaveLength(2);

    const saved = mockSave.mock.calls[0][0];
    expect(saved.distanceKm.Value).toBe(3);
    expect(saved.duration.Value).toBe(1200);
    expect(
      saved.path!.Coordinates.map((c) => ({ lat: c.Lat, lng: c.Lng }))
    ).toEqual([
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
      { lat: 40.7, lng: -120.95 },
      { lat: 38.5, lng: -120.2 },
    ]);
  });

  it("skips save when distance difference exceeds maxDeltaKm", async () => {
    responseDataHolder.data = JSON.stringify({
      routes: [
        {
          legs: [
            {
              distanceMeters: 9000,
              duration: { seconds: 600 },
              polyline: {},
            },
          ],
        },
      ],
    });

    const handler = loadHandler();
    const event = {
      Records: [
        {
          body: JSON.stringify({
            jobId: "550e8400-e29b-41d4-a716-446655440004",
            origin: "a",
            destination: "b",
            distanceKm: 10,
            maxDeltaKm: 0.5,
            routesCount: 1,
          }),
        },
      ],
    } as any;

    await handler(event);

    expect(mockSave).not.toHaveBeenCalled();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it("publishes multiple routes when routesCount specified", async () => {
    responseDataHolder.data = JSON.stringify({
      routes: [
        {
          legs: [
            {
              distanceMeters: 1500,
              duration: { seconds: 600 },
              polyline: {},
            },
          ],
        },
      ],
    });

    const handler = loadHandler();
    const event = {
      Records: [
        {
          body: JSON.stringify({
            jobId: "550e8400-e29b-41d4-a716-446655440005",
            origin: "a",
            distanceKm: 1,
            routesCount: 2,
          }),
        },
      ],
    } as any;

    await handler(event);

    expect(mockSave).toHaveBeenCalledTimes(2);
    expect(mockPublish).toHaveBeenCalledTimes(1);
    const published = mockPublish.mock.calls[0][1];
    expect(published).toHaveLength(2);
  });

  it("publishes multiple routes with destination when routesCount specified", async () => {
    responseDataHolder.data = JSON.stringify({
      routes: [
        {
          legs: [
            {
              distanceMeters: 1500,
              duration: { seconds: 600 },
              polyline: {},
            },
          ],
        },
      ],
    });

    const handler = loadHandler();
    const event = {
      Records: [
        {
          body: JSON.stringify({
            jobId: "550e8400-e29b-41d4-a716-446655440006",
            origin: "a",
            destination: "b",
            routesCount: 2,
          }),
        },
      ],
    } as any;

    await handler(event);

    expect(mockSave).toHaveBeenCalledTimes(2);
    expect(mockPublish).toHaveBeenCalledTimes(1);
    const published = mockPublish.mock.calls[0][1];
    expect(published).toHaveLength(2);
  });
});

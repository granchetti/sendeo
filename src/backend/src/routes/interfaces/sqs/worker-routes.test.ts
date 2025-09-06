import { EventEmitter } from "events";
import polyline from "@mapbox/polyline";

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

const sqsSend = jest.fn();
jest.mock("@aws-sdk/client-sqs", () => ({
  SQSClient: jest.fn().mockImplementation(() => ({ send: sqsSend })),
  SendMessageCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

const responseDataHolder: { data: string } = { data: "" };
const httpsRequest = jest.fn((opts: string | any, cb: (res: any) => void) => {
  const res = new EventEmitter();
  res.on = res.addListener;
  (res as any).statusCode = 200;
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
    sqsSend.mockReset();
    process.env.ROUTES_TABLE = "t";
    process.env.GOOGLE_API_KEY = "k";
    process.env.METRICS_QUEUE = "http://localhost";
  });

  function loadHandler() {
    return require("./worker-routes").handler as any;
  }


  it("saves decoded route when directions are returned", async () => {
    responseDataHolder.data = JSON.stringify({
      routes: [
        {
          distanceMeters: 1500,
          duration: { seconds: 600 },
          polyline: {
            encodedPolyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
          },
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
      saved.path!.Coordinates.map((c: any) => ({ lat: c.Lat, lng: c.Lng }))
    ).toEqual([
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ]);
    expect(mockPublish).toHaveBeenCalledWith(
      "550e8400-e29b-41d4-a716-446655440000",
      [saved]
    );
    expect(sqsSend).toHaveBeenCalledTimes(1);
    const msg = sqsSend.mock.calls[0][0];
    expect(msg.input.MessageBody).toContain("routes_generated");
  });

  it("does not save when response has no distance", async () => {
    responseDataHolder.data = JSON.stringify({
      routes: [{}],
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
    expect(routeCalls).toHaveLength(10);
    expect(mockSave).not.toHaveBeenCalled();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it("saves route when no encoded polyline is returned", async () => {
    responseDataHolder.data = JSON.stringify({
      routes: [
        {
          distanceMeters: 1500,
          duration: { seconds: 600 },
          polyline: {},
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
    const forward = JSON.stringify({
      routes: [
        {
          distanceMeters: 1500,
          duration: { seconds: 600 },
          polyline: {
            encodedPolyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
          },
        },
      ],
    });

    const back = JSON.stringify({
      routes: [
        {
          distanceMeters: 1500,
          duration: { seconds: 600 },
          polyline: {
            encodedPolyline: "_t~fGfzxbW~lqNwxq`@~tlLonqC",
          },
        },
      ],
    });

    const makeReq =
      (payload: string) => (opts: string | any, cb: (res: any) => void) => {
        const res = new EventEmitter();
        res.on = res.addListener;
        (res as any).statusCode = 200;
        cb(res);
        return {
          on: jest.fn(),
          write: jest.fn(),
          end: jest.fn(() => {
            const data =
              typeof opts === "string"
                ? JSON.stringify({
                    results: [{ geometry: { location: { lat: 0, lng: 0 } } }],
                  })
                : payload;
            res.emit("data", data);
            res.emit("end");
          }),
        };
      };

    httpsRequest
      .mockImplementationOnce(makeReq(""))
      .mockImplementationOnce(makeReq(""))
      .mockImplementationOnce(makeReq(forward))
      .mockImplementationOnce(makeReq(back));

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
      saved.path!.Coordinates.map((c: any) => ({ lat: c.Lat, lng: c.Lng }))
    ).toEqual([
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
      { lat: 40.7, lng: -120.95 },
      { lat: 38.5, lng: -120.2 },
    ]);
  });

  it("merges back leg coordinates with minor differences", async () => {
    const forwardCoords = [
      [38.5, -120.2],
      [40.7, -120.95],
      [43.252, -126.453],
    ];
    const backCoords = [
      [43.252001, -126.453001],
      [40.7, -120.95],
      [38.5, -120.2],
    ];
    const forward = JSON.stringify({
      routes: [
        {
          distanceMeters: 1500,
          duration: { seconds: 600 },
          polyline: { encodedPolyline: polyline.encode(forwardCoords) },
        },
      ],
    });

    const back = JSON.stringify({
      routes: [
        {
          distanceMeters: 1500,
          duration: { seconds: 600 },
          polyline: { encodedPolyline: polyline.encode(backCoords) },
        },
      ],
    });

    const makeReq =
      (payload: string) => (opts: string | any, cb: (res: any) => void) => {
        const res = new EventEmitter();
        res.on = res.addListener;
        (res as any).statusCode = 200;
        cb(res);
        return {
          on: jest.fn(),
          write: jest.fn(),
          end: jest.fn(() => {
            const data =
              typeof opts === "string"
                ? JSON.stringify({
                    results: [{ geometry: { location: { lat: 0, lng: 0 } } }],
                  })
                : payload;
            res.emit("data", data);
            res.emit("end");
          }),
        };
      };

    httpsRequest
      .mockImplementationOnce(makeReq(""))
      .mockImplementationOnce(makeReq(""))
      .mockImplementationOnce(makeReq(forward))
      .mockImplementationOnce(makeReq(back));

    const handler = loadHandler();
    const event = {
      Records: [
        {
          body: JSON.stringify({
            jobId: "550e8400-e29b-41d4-a716-446655440013",
            origin: "a",
            distanceKm: 3,
            roundTrip: true,
            routesCount: 1,
          }),
        },
      ],
    } as any;

    await handler(event);

    const saved = mockSave.mock.calls[0][0];
    expect(
      saved.path!.Coordinates.map((c: any) => ({ lat: c.Lat, lng: c.Lng }))
    ).toEqual([
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
      { lat: 40.7, lng: -120.95 },
      { lat: 38.5, lng: -120.2 },
    ]);
  });

  it("generates circular route when circle option provided", async () => {
    const makeLegPayload = (poly: string) =>
      JSON.stringify({
        routes: [
          {
            distanceMeters: 1000,
            duration: { seconds: 600 },
            polyline: { encodedPolyline: poly },
          },
        ],
      });

    const seg1 = "???_ibE";
    const seg2 = "?_ibE_ibE?";
    const seg3 = "_ibE_ibE?~hbE";
    const seg4 = "_ibE?~hbE?";

    const makeReq =
      (payload: string) => (opts: string | any, cb: (res: any) => void) => {
        const res = new EventEmitter();
        res.on = res.addListener;
        (res as any).statusCode = 200;
        cb(res);
        return {
          on: jest.fn(),
          write: jest.fn(),
          end: jest.fn(() => {
            const data =
              typeof opts === "string"
                ? JSON.stringify({
                    results: [{ geometry: { location: { lat: 0, lng: 0 } } }],
                  })
                : payload;
            res.emit("data", data);
            res.emit("end");
          }),
        };
      };

    const seq = [seg1, seg2, seg3, seg4, seg1];
    httpsRequest.mockImplementation((opts: any, cb: any) => {
      const handler =
        typeof opts === "object" && opts.host === "routes.googleapis.com"
          ? makeReq(makeLegPayload(seq.shift()!))(opts, cb)
          : makeReq("")(opts, cb);
      return handler;
    });

    const handler = loadHandler();
    const event = {
      Records: [
        {
          body: JSON.stringify({
            jobId: "550e8400-e29b-41d4-a716-44665544000c",
            origin: "a",
            distanceKm: 4,
            roundTrip: true,
            circle: true,
            routesCount: 1,
          }),
        },
      ],
    } as any;

    // deterministic bearing for test expectations
    const randSpy = jest.spyOn(Math, "random").mockReturnValue(0);
    await handler(event);
    randSpy.mockRestore();

    const routeCalls = httpsRequest.mock.calls.filter(
      ([opts]) =>
        typeof opts === "object" &&
        (opts as any).host === "routes.googleapis.com"
    );
    expect(routeCalls.length).toBeGreaterThanOrEqual(4);

    const saved = mockSave.mock.calls[0][0];
    expect(saved.distanceKm.Value).toBe(5);
    expect(saved.duration.Value).toBe(3000);
    expect(
      saved.path!.Coordinates.map((c: any) => ({ lat: c.Lat, lng: c.Lng }))
    ).toEqual([
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 1, lng: 1 },
      { lat: 1, lng: 0 },
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
    ]);
  });

  it("skips save when distance difference exceeds tolerance", async () => {
    responseDataHolder.data = JSON.stringify({
      routes: [
        {
          distanceMeters: 7000,
          duration: { seconds: 600 },
          polyline: {},
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
          distanceMeters: 1500,
          duration: { seconds: 600 },
          polyline: {},
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
          distanceMeters: 1500,
          duration: { seconds: 600 },
          polyline: {},
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

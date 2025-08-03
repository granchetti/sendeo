import { Route } from "../../domain/entities/route-entity";
import { UUID } from "../../domain/value-objects/uuid-value-object";
import { DistanceKm } from "../../domain/value-objects/distance-value-object";
import { Duration } from "../../domain/value-objects/duration-value-object";
import { Path } from "../../domain/value-objects/path-value-object";
import { LatLng } from "../../domain/value-objects/lat-lng-value-object";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoRouteRepository } from "./dynamo-route-repository";

const mockSend = jest.fn();
const mockPut = jest.fn();
const mockGet = jest.fn();
const mockQuery = jest.fn();

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutItemCommand: jest.fn().mockImplementation((input) => {
    mockPut(input);
    return input;
  }),
  GetItemCommand: jest.fn().mockImplementation((input) => {
    mockGet(input);
    return input;
  }),
  QueryCommand: jest.fn().mockImplementation((input) => {
    mockQuery(input);
    return input;
  }),
}));

const tableName = "routes";

describe("DynamoRouteRepository", () => {
  let repository: DynamoRouteRepository;

  beforeEach(() => {
    mockSend.mockReset();
    mockPut.mockReset();
    mockGet.mockReset();
    mockQuery.mockReset();
    repository = new DynamoRouteRepository(
      new DynamoDBClient({}) as any,
      tableName
    );
  });

  it("save correctly calls PutItemCommand", async () => {
    const coords = [LatLng.fromNumbers(1, 2), LatLng.fromNumbers(3, 4)];
    const path = Path.fromCoordinates(coords);
    const route = new Route({
      routeId: UUID.generate(),
      jobId: UUID.generate(),
      distanceKm: new DistanceKm(5),
      duration: new Duration(10),
      path,
      description: "desc",
    });

    const now = 1_600_000_000;
    const spy = jest.spyOn(Date, "now").mockReturnValue(now * 1000);
    process.env.ROUTES_TTL = "60";

    await repository.save(route);

    const expectedItem = {
      routeId: { S: route.routeId.Value },
      jobId: { S: route.jobId?.Value || "" },
      distanceKm: { N: "5" },
      duration: { N: "10" },
      path: { S: path.Encoded },
      createdAt: { N: now.toString() },
      ttl: { N: (now + 60).toString() },
      description: { S: "desc" },
    };

    expect(mockPut).toHaveBeenCalledWith({
      TableName: tableName,
      Item: expectedItem,
    });
    expect(mockSend).toHaveBeenCalledWith({
      TableName: tableName,
      Item: expectedItem,
    });

    spy.mockRestore();
    delete process.env.ROUTES_TTL;
  });

  it("findById reconstructs a Route from response", async () => {
    const routeId = UUID.generate().Value;
    const jobId = UUID.generate().Value;
    const coords = [LatLng.fromNumbers(1, 2), LatLng.fromNumbers(3, 4)];
    const encoded = Path.fromCoordinates(coords).Encoded;
    const returned = {
      routeId: { S: routeId },
      jobId: { S: jobId },
      distanceKm: { N: "5" },
      duration: { N: "10" },
      path: { S: encoded },
      description: { S: "desc" },
    };
    mockSend.mockResolvedValueOnce({ Item: returned });

    const route = await repository.findById(UUID.fromString(routeId));

    expect(mockGet).toHaveBeenCalledWith({
      TableName: tableName,
      Key: { routeId: { S: routeId } },
    });
    expect(route?.routeId.Value).toBe(routeId);
    expect(route?.jobId?.Value).toBe(jobId);
    expect(route?.distanceKm?.Value).toBe(5);
    expect(route?.duration?.Value).toBe(10);
    expect(route?.description).toBe("desc");
    expect(
      route?.path?.Coordinates.map((c) => ({ lat: c.Lat, lng: c.Lng }))
    ).toEqual([
      { lat: 1, lng: 2 },
      { lat: 3, lng: 4 },
    ]);
  });

  it("findByJobId queries using GSI2", async () => {
    const routeId = UUID.generate().Value;
    const jobId = UUID.generate().Value;
    const returned = {
      Items: [
        {
          routeId: { S: routeId },
          jobId: { S: jobId },
          description: { S: "d" },
        },
      ],
    };
    mockSend.mockResolvedValueOnce(returned);

    const res = await repository.findByJobId(jobId);

    expect(mockQuery).toHaveBeenCalledWith({
      TableName: tableName,
      IndexName: "GSI2",
      KeyConditionExpression: "jobId = :job",
      ExpressionAttributeValues: { ":job": { S: jobId } },
    });
    expect(res).toHaveLength(1);
    expect(res[0].jobId?.Value).toBe(jobId);
    expect(res[0].description).toBe("d");
  });
});

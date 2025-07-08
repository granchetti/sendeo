import { Route } from '../../domain/entities/route-entity';
import { RouteId } from '../../domain/value-objects/route-id-value-object';
import { DistanceKm } from '../../domain/value-objects/distance-value-object';
import { Duration } from '../../domain/value-objects/duration-value-object';
import { Path } from '../../domain/value-objects/path-value-object';
import { LatLng } from '../../domain/value-objects/lat-lng-value-object';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoRouteRepository } from './dynamo-route-repository';

const mockSend = jest.fn();
const mockPut = jest.fn();
const mockGet = jest.fn();
const mockQuery = jest.fn();

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest
    .fn()
    .mockImplementation(() => ({ send: mockSend })),
  PutItemCommand: jest
    .fn()
    .mockImplementation((input) => { mockPut(input); return input; }),
  GetItemCommand: jest
    .fn()
    .mockImplementation((input) => { mockGet(input); return input; }),
  QueryCommand: jest
    .fn()
    .mockImplementation((input) => { mockQuery(input); return input; }),
}));

const tableName = 'routes';

describe('DynamoRouteRepository', () => {
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

  it('save correctly calls PutItemCommand', async () => {
    const coords = [
      LatLng.fromNumbers(1, 2),
      LatLng.fromNumbers(3, 4),
    ];
    const path = Path.fromCoordinates(coords);
    const route = new Route({
      routeId: RouteId.generate(),
      jobId: 'job1',
      distanceKm: new DistanceKm(5),
      duration: new Duration(10),
      path,
    });

    const now = 1_600_000_000;
    const spy = jest.spyOn(Date, 'now').mockReturnValue(now * 1000);
    process.env.ROUTES_TTL = '60';

    await repository.save(route);

    const expectedItem = {
      routeId: { S: route.routeId.Value },
      jobId: { S: 'job1' },
      distanceKm: { N: '5' },
      duration: { N: '10' },
      path: { S: path.Encoded },
      createdAt: { N: now.toString() },
      ttl: { N: (now + 60).toString() },
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

  it('findById reconstructs a Route from response', async () => {
    const id = RouteId.generate().Value;
    const coords = [
      LatLng.fromNumbers(1, 2),
      LatLng.fromNumbers(3, 4),
    ];
    // Prepara un encoded válido para el mock de Dynamo
    const encoded = Path.fromCoordinates(coords).Encoded;
    const returned = {
      routeId: { S: id },
      jobId: { S: 'job1' },
      distanceKm: { N: '5' },
      duration:  { N: '10' },
      path:      { S: encoded },
    };
    mockSend.mockResolvedValueOnce({ Item: returned });

    const route = await repository.findById(RouteId.fromString(id));

    expect(mockGet).toHaveBeenCalledWith({
      TableName: tableName,
      Key: { routeId: { S: id } },
    });
    expect(route?.routeId.Value).toBe(id);
    expect(route?.jobId).toBe('job1');
    expect(route?.distanceKm?.Value).toBe(5);
    expect(route?.duration?.Value).toBe(10);
    // Y comprobamos que se haya decodificado correctamente
    expect(route?.path?.Coordinates.map(c => ({ lat: c.Lat, lng: c.Lng }))).toEqual([
      { lat: 1, lng: 2 },
      { lat: 3, lng: 4 },
    ]);
  });

  it('findByJobId queries using GSI2', async () => {
    const returned = {
      Items: [
        {
          routeId: { S: '1' },
          jobId: { S: 'job1' },
        },
      ],
    };
    mockSend.mockResolvedValueOnce(returned);

    const res = await repository.findByJobId('job1');

    expect(mockQuery).toHaveBeenCalledWith({
      TableName: tableName,
      IndexName: 'GSI2',
      KeyConditionExpression: 'jobId = :job',
      ExpressionAttributeValues: { ':job': { S: 'job1' } },
    });
    expect(res).toHaveLength(1);
    expect(res[0].jobId).toBe('job1');
  });
});

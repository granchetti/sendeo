
import { Route } from '../../domain/entities/route-entity';
import { RouteId } from '../../domain/value-objects/route-id-value-object';
import { DistanceKm } from '../../domain/value-objects/distance-value-object';
import { Duration } from '../../domain/value-objects/duration-value-object';
import { Path } from '../../domain/value-objects/path-value-object';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoRouteRepository } from './dynamo-route-repository';

const mockSend = jest.fn();
const mockPut = jest.fn();
const mockGet = jest.fn();

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutItemCommand: jest.fn().mockImplementation((input) => { mockPut(input); return input; }),
  GetItemCommand: jest.fn().mockImplementation((input) => { mockGet(input); return input; }),
}));

const tableName = 'routes';

describe('DynamoRouteRepository', () => {
  let repository: DynamoRouteRepository;

  beforeEach(() => {
    mockSend.mockReset();
    mockPut.mockReset();
    mockGet.mockReset();
    repository = new DynamoRouteRepository(new DynamoDBClient({}) as any, tableName);
  });

  it('save correctly calls PutItemCommand', async () => {
    const route = new Route({
      routeId: RouteId.generate(),
      distanceKm: new DistanceKm(5),
      duration: new Duration(10),
      path: new Path([
        { lat: 1, lng: 2 },
        { lat: 3, lng: 4 },
      ]),
    });

    await repository.save(route);

    const expectedItem = {
      routeId: { S: route.routeId.Value },
      distanceKm: { N: '5' },
      duration: { N: '10' },
      path: { S: JSON.stringify(route.path!.Coordinates) },
    };

    expect(mockPut).toHaveBeenCalledWith({ TableName: tableName, Item: expectedItem });
    expect(mockSend).toHaveBeenCalledWith({ TableName: tableName, Item: expectedItem });
  });

  it('findById reconstructs a Route from response', async () => {
    const id = RouteId.generate().Value;
    const returned = {
      routeId: { S: id },
      distanceKm: { N: '5' },
      duration: { N: '10' },
      path: { S: JSON.stringify([{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }]) },
    };
    mockSend.mockResolvedValueOnce({ Item: returned });

    const route = await repository.findById(id);

    expect(mockGet).toHaveBeenCalledWith({ TableName: tableName, Key: { routeId: { S: id } } });
    expect(route?.routeId.Value).toBe(id);
    expect(route?.distanceKm?.Value).toBe(5);
    expect(route?.duration?.Value).toBe(10);
    expect(route?.path?.Coordinates).toEqual([
      { lat: 1, lng: 2 },
      { lat: 3, lng: 4 },
    ]);
  });
});
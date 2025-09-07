import {
  DynamoDBClient,
  PutItemCommand,
  DeleteItemCommand,
  GetItemCommand,
} from '@aws-sdk/client-dynamodb';
import { DynamoUserActivityRepository } from './dynamo-user-activity-repository';

describe('DynamoUserActivityRepository', () => {
  let mockSend: jest.Mock;
  let repo: DynamoUserActivityRepository;
  const tableName = 'UserState';
  const email = 'test@example.com';
  const routeId = '123';

  beforeEach(() => {
    mockSend = jest.fn();
    const client = { send: mockSend } as unknown as DynamoDBClient;
    repo = new DynamoUserActivityRepository(client, tableName);
  });

  it('stores active route information', async () => {
    process.env.ACTIVE_ROUTE_TTL = '60';
    await repo.putActiveRoute(email, routeId, 123);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(PutItemCommand);
    expect((cmd as any).input).toEqual({
      TableName: tableName,
      Item: {
        PK: { S: `USER#${email}` },
        SK: { S: `ACTIVE_ROUTE#${routeId}` },
        startedAt: { N: '123' },
        ttl: { N: '60' },
      },
    });
    delete process.env.ACTIVE_ROUTE_TTL;
  });

  it('retrieves active route information', async () => {
    mockSend.mockResolvedValueOnce({
      Item: { startedAt: { N: '456' }, checkpointIndex: { N: '2' } },
    });
    const info = await repo.getActiveRoute(email, routeId);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(GetItemCommand);
    expect(info).toEqual({ startedAt: 456, checkpointIndex: 2 });
  });

  it('deletes active route information', async () => {
    await repo.deleteActiveRoute(email, routeId);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(DeleteItemCommand);
    expect((cmd as any).input).toEqual({
      TableName: tableName,
      Key: { PK: { S: `USER#${email}` }, SK: { S: `ACTIVE_ROUTE#${routeId}` } },
    });
  });
});

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

  it('stores route start timestamp', async () => {
    await repo.putRouteStart(email, routeId, 123);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(PutItemCommand);
    expect((cmd as any).input).toEqual({
      TableName: tableName,
      Item: {
        PK: { S: `USER#${email}` },
        SK: { S: `START#${routeId}` },
        timestamp: { N: '123' },
      },
    });
  });

  it('retrieves start timestamp', async () => {
    mockSend.mockResolvedValueOnce({ Item: { timestamp: { N: '456' } } });
    const ts = await repo.getRouteStart(email, routeId);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(GetItemCommand);
    expect(ts).toBe(456);
  });

  it('deletes start timestamp', async () => {
    await repo.deleteRouteStart(email, routeId);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(DeleteItemCommand);
    expect((cmd as any).input).toEqual({
      TableName: tableName,
      Key: { PK: { S: `USER#${email}` }, SK: { S: `START#${routeId}` } },
    });
  });
});

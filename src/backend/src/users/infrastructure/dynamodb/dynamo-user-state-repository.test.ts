import {
  DynamoDBClient,
  PutItemCommand,
  DeleteItemCommand,
  QueryCommand,
  GetItemCommand,
} from '@aws-sdk/client-dynamodb';
import { DynamoUserStateRepository } from './dynamo-user-state-repository';
import { UserProfile } from '../../domain/entities/user-profile';
import { Email } from '../../../shared/domain/value-objects/email-value-object';

describe('DynamoUserStateRepository', () => {
  let mockSend: jest.Mock;
  let repo: DynamoUserStateRepository;
  const tableName = 'UserState';
  const email = Email.fromString('test@example.com');
  const routeId = '123';

  beforeEach(() => {
    mockSend = jest.fn();
    const client = { send: mockSend } as unknown as DynamoDBClient;
    repo = new DynamoUserStateRepository(client, tableName);
  });

  it('putFavourite sends a PutItemCommand with correct params', async () => {
    await repo.putFavourite(email.Value, routeId);
    expect(mockSend).toHaveBeenCalledTimes(1);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(PutItemCommand);
    expect((cmd as any).input).toEqual({
      TableName: tableName,
      Item: {
        PK: { S: `USER#${email.Value}` },
        SK: { S: `FAV#${routeId}` },
      },
    });
  });

  it('deleteFavourite sends a DeleteItemCommand with correct params', async () => {
    await repo.deleteFavourite(email.Value, routeId);
    expect(mockSend).toHaveBeenCalledTimes(1);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(DeleteItemCommand);
    expect((cmd as any).input).toEqual({
      TableName: tableName,
      Key: {
        PK: { S: `USER#${email.Value}` },
        SK: { S: `FAV#${routeId}` },
      },
    });
  });

  it('getFavourites returns SK values from QueryCommand results', async () => {
    const items = [{ SK: { S: 'FAV#1' } }, { SK: { S: 'FAV#2' } }];
    mockSend.mockResolvedValueOnce({ Items: items });
    const result = await repo.getFavourites(email.Value);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(QueryCommand);
    expect((cmd as any).input).toEqual({
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :fav)',
      ExpressionAttributeValues: { ':pk': { S: `USER#${email.Value}` }, ':fav': { S: 'FAV#' } },
    });

    expect(result).toEqual(['1', '2']);
  });

  it('getFavourites returns empty array if no items', async () => {
    mockSend.mockResolvedValueOnce({});
    const result = await repo.getFavourites(email.Value);
    expect(mockSend).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('putProfile sends a PutItemCommand with correct params', async () => {
    const profile = UserProfile.fromPrimitives({
      email: email.Value,
      firstName: 'Test',
      lastName: 'User',
      displayName: 'TU',
      age: 30,
      unit: 'km',
    });
    await repo.putProfile(profile);
    expect(mockSend).toHaveBeenCalledTimes(1);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(PutItemCommand);
    expect((cmd as any).input).toEqual({
      TableName: tableName,
      Item: {
        PK: { S: `USER#${email.Value}` },
        SK: { S: 'PROFILE' },
        email: { S: email.Value },
        firstName: { S: 'Test' },
        lastName: { S: 'User' },
        displayName: { S: 'TU' },
        age: { N: '30' },
        unit: { S: 'km' },
      },
    });
  });

  it('getProfile returns parsed profile', async () => {
    mockSend.mockResolvedValueOnce({
      Item: {
        email: { S: email.Value },
        firstName: { S: 'Test' },
        lastName: { S: 'User' },
        displayName: { S: 'TU' },
        age: { N: '40' },
        unit: { S: 'mi' },
      },
    });
    const result = await repo.getProfile(email);
    expect(mockSend).toHaveBeenCalledTimes(1);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(GetItemCommand);
    expect((cmd as any).input).toEqual({
      TableName: tableName,
      Key: { PK: { S: `USER#${email.Value}` }, SK: { S: 'PROFILE' } },
    });
    expect(result?.toPrimitives()).toEqual({
      email: email.Value,
      firstName: 'Test',
      lastName: 'User',
      displayName: 'TU',
      age: 40,
      unit: 'mi',
    });
  });

  it('getProfile returns null when no item', async () => {
    mockSend.mockResolvedValueOnce({});
    const result = await repo.getProfile(email);
    expect(mockSend).toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('stores route start timestamp', async () => {
    await repo.putRouteStart(email.Value, routeId, 123);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(PutItemCommand);
    expect((cmd as any).input).toEqual({
      TableName: tableName,
      Item: {
        PK: { S: `USER#${email.Value}` },
        SK: { S: `START#${routeId}` },
        timestamp: { N: '123' },
      },
    });
  });

  it('retrieves start timestamp', async () => {
    mockSend.mockResolvedValueOnce({
      Item: { timestamp: { N: '456' } },
    });
    const ts = await repo.getRouteStart(email.Value, routeId);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(GetItemCommand);
    expect(ts).toBe(456);
  });

  it('deletes start timestamp', async () => {
    await repo.deleteRouteStart(email.Value, routeId);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(DeleteItemCommand);
    expect((cmd as any).input).toEqual({
      TableName: tableName,
      Key: { PK: { S: `USER#${email.Value}` }, SK: { S: `START#${routeId}` } },
    });
  });
});

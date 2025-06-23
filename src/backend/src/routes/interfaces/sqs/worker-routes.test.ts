import { EventEmitter } from 'events';

const mockSave = jest.fn();

jest.mock('../../infrastructure/dynamodb/dynamo-route-repository', () => ({
  DynamoRouteRepository: jest.fn().mockImplementation(() => ({ save: mockSave }))
}));

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({}))
}));

const responseDataHolder: { data: string } = { data: '' };
const httpsRequest = jest.fn((url: string, cb: (res: any) => void) => {
  const res = new EventEmitter();
  res.on = res.addListener;
  cb(res);
  return {
    on: jest.fn(),
    end: jest.fn(() => {
      res.emit('data', responseDataHolder.data);
      res.emit('end');
    })
  };
});

jest.mock('node:https', () => ({ request: httpsRequest }));

describe('worker routes handler', () => {
  beforeEach(() => {
    jest.resetModules();
    mockSave.mockReset();
    httpsRequest.mockClear();
    process.env.ROUTES_TABLE = 't';
    process.env.GOOGLE_API_KEY = 'k';
  });

  function loadHandler() {
    return require('./worker-routes').handler as any;
  }

  it('saves decoded route when directions are returned', async () => {
    responseDataHolder.data = JSON.stringify({
      routes: [
        {
          overview_polyline: { points: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' },
          legs: [
            {
              distance: { value: 1500 },
              duration: { value: 600 }
            }
          ]
        }
      ]
    });

    const handler = loadHandler();
    const event = {
      Records: [
        {
          body: JSON.stringify({
            routeId: '550e8400-e29b-41d4-a716-446655440000',
            origin: 'a',
            destination: 'b'
          })
        }
      ]
    };

    await handler(event);

    expect(httpsRequest).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledTimes(1);
    const saved = mockSave.mock.calls[0][0];
    expect(saved.routeId.Value).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(saved.distanceKm.Value).toBe(1.5);
    expect(saved.duration.Value).toBe(600);
    expect(saved.path.Coordinates).toEqual([
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 }
    ]);
  });

  it('does not save when response has no legs', async () => {
    responseDataHolder.data = JSON.stringify({ routes: [{ legs: [] }] });
    const handler = loadHandler();

    const event = { Records: [{ body: JSON.stringify({ routeId: '550e8400-e29b-41d4-a716-446655440000', origin: 'a', destination: 'b' }) }] };

    await handler(event);

    expect(mockSave).not.toHaveBeenCalled();
  });
});
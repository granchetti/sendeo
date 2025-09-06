import polyline from '@mapbox/polyline';
import { BedrockRouteDescriptionService } from './bedrock-route-description-service';
import { MapProvider } from '../domain/services/map-provider';

const sendMock = jest.fn();

jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: jest.fn(() => ({ send: sendMock })),
  InvokeModelCommand: jest.fn().mockImplementation((args) => ({ args })),
}));

describe('BedrockRouteDescriptionService', () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({
      body: Buffer.from(
        JSON.stringify({ content: [{ text: 'desc from bedrock' }] })
      ),
    });
    (global as any).fetch = jest.fn().mockResolvedValue({
      json: async () => ({ current: { temperature_2m: 20 } }),
    });
  });

  it('invokes bedrock and returns description', async () => {
    const service = new BedrockRouteDescriptionService();
    const path = polyline.encode([
      [0, 0],
      [1, 1],
    ]);
    const provider: MapProvider = {
      getCityName: jest.fn().mockResolvedValue('TestCity'),
    };

    const result = await service.describe(path, provider);

    expect(sendMock).toHaveBeenCalled();
    expect(result).toBe('desc from bedrock');
    expect(provider.getCityName).toHaveBeenCalled();
  });
});


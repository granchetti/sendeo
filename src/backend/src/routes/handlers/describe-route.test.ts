let sendMock: jest.Mock;

jest.mock('@aws-sdk/client-bedrock-runtime', () => {
  sendMock = jest.fn();
  return {
    BedrockRuntimeClient: jest.fn(() => ({ send: sendMock })),
    InvokeModelCommand: jest.fn((input: any) => ({ input })),
  };
});

import polyline from '@mapbox/polyline';
import { describeRoute } from './describe-route';

describe('describeRoute', () => {
  let dateSpy: jest.SpyInstance<number, []>;

  beforeEach(() => {
    sendMock.mockReset();
    (global as any).fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ current: { temperature_2m: 20 } }),
    });
    dateSpy = jest.spyOn(Date, 'now').mockReturnValue(1720000000000);
  });

  afterEach(() => {
    dateSpy.mockRestore();
  });

  it('constructs prompt and parses result', async () => {
    const coords: [number, number][] = [
      [40, -73],
      [40.01, -73.01],
    ];
    const encoded = polyline.encode(coords);
    const mapProvider = { getCityName: jest.fn().mockResolvedValue('Metropolis') };

    sendMock.mockResolvedValue({
      body: Buffer.from(
        JSON.stringify({ content: [{ text: 'Generated description' }] })
      ),
    });

    const result = await describeRoute(encoded, mapProvider as any, 'test-model');

    expect(result).toBe('Generated description');
    expect(mapProvider.getCityName).toHaveBeenCalledWith(40, -73);
    expect((global as any).fetch).toHaveBeenCalledWith(
      expect.stringContaining('latitude=40&longitude=-73')
    );

    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0][0];
    const payload = JSON.parse(command.input.body.toString());

    expect(command.input.modelId).toBe('test-model');
    expect(payload.system).toContain('Metropolis');
    expect(payload.messages[0].content).toContain('The current temperature is 20°C.');
    expect(payload.messages[0].content).toContain(JSON.stringify(coords));
  });
});


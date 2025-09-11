const sendMock = jest.fn();

jest.mock(
  "@aws-sdk/client-cloudwatch",
  () => ({
    CloudWatchClient: jest.fn().mockImplementation(() => ({ send: sendMock })),
    PutMetricDataCommand: jest.fn().mockImplementation((input) => ({ input })),
  }),
  { virtual: true }
);

describe("metrics processor", () => {
  beforeEach(() => {
    sendMock.mockReset();
    process.env.METRICS_NAMESPACE = "TestNS";
  });

  it("publishes generated routes count", async () => {
    const { handler } = require("./metrics-processor");
    await handler({
      Records: [
        {
          body: JSON.stringify({
            version: 1,
            event: "routes_generated",
            count: 3,
            timestamp: 1000,
          }),
        },
      ],
    });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0];
    expect(call.input.Namespace).toBe("TestNS");
    expect(call.input.MetricData).toEqual([
      expect.objectContaining({
        MetricName: "RoutesGenerated",
        Value: 3,
        Unit: "Count",
      }),
    ]);
  });

  it("publishes metrics for finished routes", async () => {
    const { handler } = require("./metrics-processor");
    await handler({
      Records: [
        {
          body: JSON.stringify({
            version: 1,
            event: "finished",
            actualDuration: 120,
            timestamp: 2000,
          }),
        },
      ],
    });
    const data = sendMock.mock.calls[0][0].input.MetricData;
    expect(data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          MetricName: "RouteFinished",
          Value: 1,
          Unit: "Count",
        }),
        expect.objectContaining({
          MetricName: "ActualDuration",
          Value: 120,
          Unit: "Seconds",
        }),
      ])
    );
  });

  it("skips messages with unknown version", async () => {
    const { handler } = require("./metrics-processor");
    await handler({
      Records: [
        {
          body: JSON.stringify({ version: 2, event: "started" }),
        },
      ],
    });
    expect(sendMock).not.toHaveBeenCalled();
  });
});

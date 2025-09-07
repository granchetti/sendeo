const ddbSendMock = jest.fn();
const sqsSendMock = jest.fn();
const cwSendMock = jest.fn();

jest.mock(
  "@aws-sdk/client-dynamodb",
  () => ({
    DynamoDBClient: jest.fn().mockImplementation(() => ({ send: ddbSendMock })),
    ScanCommand: jest.fn().mockImplementation((input) => ({ input })),
    DeleteItemCommand: jest.fn().mockImplementation((input) => ({ input })),
  }),
  { virtual: true }
);
jest.mock(
  "@aws-sdk/client-sqs",
  () => ({
    SQSClient: jest.fn().mockImplementation(() => ({ send: sqsSendMock })),
    SendMessageCommand: jest.fn().mockImplementation((input) => ({ input })),
  }),
  { virtual: true }
);
jest.mock(
  "@aws-sdk/client-cloudwatch",
  () => ({
    CloudWatchClient: jest.fn().mockImplementation(() => ({ send: cwSendMock })),
    PutMetricDataCommand: jest.fn().mockImplementation((input) => ({ input })),
  }),
  { virtual: true }
);

describe("cache cleaner", () => {
  beforeEach(() => {
    ddbSendMock.mockReset();
    sqsSendMock.mockReset();
    cwSendMock.mockReset();
    process.env.ROUTES_TABLE = "routes";
    process.env.METRICS_QUEUE = "queue";
    process.env.METRICS_NAMESPACE = "TestNS";
  });

  it("removes expired items and publishes metrics", async () => {
    ddbSendMock.mockResolvedValueOnce({
      Items: [{ routeId: { S: "r1" } }, { routeId: { S: "r2" } }],
    });
    const { handler } = require("./cache-cleaner");
    await handler();

    // should delete both items
    expect(ddbSendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ TableName: "routes" }),
      })
    );
    // send metric
    expect(cwSendMock).toHaveBeenCalledTimes(1);
    const metricCall = cwSendMock.mock.calls[0][0].input;
    expect(metricCall.Namespace).toBe("TestNS");
    expect(metricCall.MetricData[0].MetricName).toBe("CacheExpired");
    expect(metricCall.MetricData[0].Value).toBe(2);
    // send event message
    expect(sqsSendMock).toHaveBeenCalledTimes(1);
    const msg = sqsSendMock.mock.calls[0][0].input.MessageBody;
    expect(JSON.parse(msg)).toEqual(
      expect.objectContaining({ event: "CacheExpired", count: 2 })
    );
  });
});

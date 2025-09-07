const sendMock = jest.fn();

jest.mock(
  "@aws-sdk/client-cloudwatch",
  () => ({
    CloudWatchClient: jest.fn().mockImplementation(() => ({ send: sendMock })),
    PutMetricDataCommand: jest.fn().mockImplementation((input) => ({ input })),
  }),
  { virtual: true }
);

import type { PostAuthenticationTriggerEvent } from "aws-lambda";

function createEvent(): PostAuthenticationTriggerEvent {
  return {
    version: "1",
    region: "us-east-1",
    userPoolId: "pool",
    userName: "user",
    triggerSource: "PostAuthentication_Authentication",
    callerContext: {} as any,
    request: {
      userAttributes: {},
      newDeviceUsed: false,
      clientMetadata: {},
    },
    response: {},
  } as any;
}

describe("post-authentication trigger", () => {
  beforeEach(() => {
    sendMock.mockReset();
    process.env.METRICS_NAMESPACE = "TestNS";
  });

  it("logs and publishes metric", async () => {
    const { handler } = require("./post-authentication");
    const consoleSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    await handler(createEvent());
    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.mock.calls[0][0]).toContain("UserLoggedIn");
    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0];
    expect(call.input.Namespace).toBe("TestNS");
    expect(call.input.MetricData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ MetricName: "UserLoggedIn", Value: 1, Unit: "Count" }),
      ])
    );
    consoleSpy.mockRestore();
  });
});

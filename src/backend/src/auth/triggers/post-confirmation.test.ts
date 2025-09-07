const sendMock = jest.fn();

jest.mock(
  "@aws-sdk/client-cloudwatch",
  () => ({
    CloudWatchClient: jest.fn().mockImplementation(() => ({ send: sendMock })),
    PutMetricDataCommand: jest.fn().mockImplementation((input) => ({ input })),
  }),
  { virtual: true }
);

import type { PostConfirmationTriggerEvent } from "aws-lambda";

function createEvent(): PostConfirmationTriggerEvent {
  return {
    version: "1",
    region: "us-east-1",
    userPoolId: "pool",
    userName: "user",
    triggerSource: "PostConfirmation_ConfirmSignUp",
    callerContext: {} as any,
    request: {
      userAttributes: {},
      clientMetadata: {},
    },
    response: {},
  } as any;
}

describe("post-confirmation trigger", () => {
  beforeEach(() => {
    sendMock.mockReset();
    process.env.METRICS_NAMESPACE = "TestNS";
  });

  it("logs and publishes metric", async () => {
    const { handler } = require("./post-confirmation");
    const consoleSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    await handler(createEvent());
    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.mock.calls[0][0]).toContain("UserSignedUp");
    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0];
    expect(call.input.Namespace).toBe("TestNS");
    expect(call.input.MetricData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ MetricName: "UserSignedUp", Value: 1, Unit: "Count" }),
      ])
    );
    consoleSpy.mockRestore();
  });
});

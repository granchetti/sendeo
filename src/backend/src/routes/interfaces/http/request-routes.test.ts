let mockSend: jest.Mock;

jest.mock("@aws-sdk/client-sqs", () => {
  mockSend = jest.fn();
  return {
    SQSClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
    SendMessageCommand: jest.fn().mockImplementation((input) => input),
  };
});

import { handler } from "./request-routes";
import { RouteId } from "../../domain/value-objects/route-id-value-object";

beforeEach(() => {
  mockSend.mockReset();
  process.env.QUEUE_URL = "http://localhost";
});

describe("request routes handler", () => {
  it("generates routeId when missing", async () => {
    mockSend.mockResolvedValueOnce({});
    const res = await handler({
      body: JSON.stringify({ origin: "A", destination: "B" }),
    } as any);
    expect(mockSend).toHaveBeenCalledTimes(1);
    const sent = mockSend.mock.calls[0][0];
    const payload = JSON.parse(sent.MessageBody);
    expect(payload.routeId).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.parse(res.body).routeId).toBe(payload.routeId);
  });

  it("keeps provided routeId", async () => {
    const routeId = RouteId.generate().Value;
    mockSend.mockResolvedValueOnce({});
    const res = await handler({ body: JSON.stringify({ routeId }) } as any);
    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(mockSend.mock.calls[0][0].MessageBody);
    expect(payload.routeId).toBe(routeId);
    expect(JSON.parse(res.body).routeId).toBe(routeId);
  });
});

let mockSend: jest.Mock;

jest.mock("@aws-sdk/client-sqs", () => {
  mockSend = jest.fn();
  return {
    SQSClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
    SendMessageCommand: jest.fn().mockImplementation((input) => input),
  };
});

import { handler } from "./request-routes";
import { UUID } from "../../domain/value-objects/uuid-value-object";

beforeEach(() => {
  mockSend.mockReset();
  process.env.QUEUE_URL = "http://localhost";
});

describe("request routes handler", () => {
  it("generates jobId when missing", async () => {
    mockSend.mockResolvedValueOnce({});
    const res = await handler({
      body: JSON.stringify({ origin: "A", destination: "B" }),
    } as any);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const sent = mockSend.mock.calls[0][0];
    const payload = JSON.parse(sent.MessageBody);

    expect(payload.jobId).toMatch(/^[0-9a-f-]{36}$/);
    const body = JSON.parse(res.body);
    expect(body.jobId).toBe(payload.jobId);
    expect(body.enqueued).toBe(true);
  });

  it("keeps provided jobId", async () => {
    const jobId = UUID.generate().Value;
    mockSend.mockResolvedValueOnce({});
    const res = await handler({
      body: JSON.stringify({ jobId, origin: "A", destination: "B" }),
    } as any);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(mockSend.mock.calls[0][0].MessageBody);

    expect(payload.jobId).toBe(jobId);
    const body = JSON.parse(res.body);
    expect(body.jobId).toBe(jobId);
    expect(body.enqueued).toBe(true);
  });

  it("returns 400 when body parsing fails", async () => {
    const res = await handler({ body: '{"invalid"' } as any);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBeDefined();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns 400 when missing origin or destination/distanceKm", async () => {
    mockSend.mockResolvedValueOnce({});
    const res1 = await handler({ body: JSON.stringify({ destination: "B" }) } as any);
    expect(res1.statusCode).toBe(400);
    const res2 = await handler({ body: JSON.stringify({ origin: "A" }) } as any);
    expect(res2.statusCode).toBe(400);
  });

  it("forwards maxDeltaKm when provided", async () => {
    mockSend.mockResolvedValueOnce({});
    await handler({
      body: JSON.stringify({ origin: "A", destination: "B", maxDeltaKm: "1" }),
    } as any);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(mockSend.mock.calls[0][0].MessageBody);
    expect(payload.maxDeltaKm).toBe(1);
  });

  it("forwards routesCount when provided", async () => {
    mockSend.mockResolvedValueOnce({});
    await handler({
      body: JSON.stringify({ origin: "A", destination: "B", routesCount: 3 }),
    } as any);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(mockSend.mock.calls[0][0].MessageBody);
    expect(payload.routesCount).toBe(3);
  });
});

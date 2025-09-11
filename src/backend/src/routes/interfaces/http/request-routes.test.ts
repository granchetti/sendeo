const mockSend = jest.fn();

import { createRequestRoutesHandler } from "./request-routes";
import { RouteRequestQueue } from "../../domain/queues/route-request-queue";

let queue: RouteRequestQueue;
let handler: any;
import { UUID } from "../../../shared/domain/value-objects/uuid";

beforeEach(() => {
  mockSend.mockReset();
  queue = { send: mockSend };
  handler = createRequestRoutesHandler(queue);
});

describe("request routes handler", () => {
  it("generates jobId when missing", async () => {
    mockSend.mockResolvedValueOnce({});
    const res = await handler({
      headers: { Accept: "application/json" },
      body: JSON.stringify({ origin: "A", destination: "B" }),
    } as any);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const sent = mockSend.mock.calls[0][0];
    const payload = JSON.parse(sent);

    expect(payload.jobId).toMatch(/^[0-9a-f-]{36}$/);
    expect(payload.correlationId).toMatch(/^[0-9a-f-]{36}$/);
    const body = JSON.parse(res.body);
    expect(body.jobId).toBe(payload.jobId);
    expect(body.enqueued).toBe(true);
  });

  it("keeps provided jobId", async () => {
    const jobId = UUID.generate().Value;
    const correlationId = UUID.generate().Value;
    mockSend.mockResolvedValueOnce({});
    const res = await handler({
      headers: { Accept: "application/json" },
      body: JSON.stringify({
        jobId,
        correlationId,
        origin: "A",
        destination: "B",
      }),
    } as any);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(mockSend.mock.calls[0][0]);

    expect(payload.jobId).toBe(jobId);
    expect(payload.correlationId).toBe(correlationId);
    const body = JSON.parse(res.body);
    expect(body.jobId).toBe(jobId);
    expect(body.enqueued).toBe(true);
  });

  it("generates correlationId when missing", async () => {
    mockSend.mockResolvedValueOnce({});
    await handler({
      headers: { Accept: "application/json" },
      body: JSON.stringify({ origin: "A", destination: "B" }),
    } as any);

    const payload = JSON.parse(mockSend.mock.calls[0][0]);
    expect(payload.correlationId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("keeps provided correlationId", async () => {
    const correlationId = UUID.generate().Value;
    mockSend.mockResolvedValueOnce({});
    await handler({
      headers: { Accept: "application/json" },
      body: JSON.stringify({
        origin: "A",
        destination: "B",
        correlationId,
      }),
    } as any);

    const payload = JSON.parse(mockSend.mock.calls[0][0]);
    expect(payload.correlationId).toBe(correlationId);
  });

  it("returns 400 when body parsing fails", async () => {
    const res = await handler({ headers: { Accept: "application/json" }, body: '{"invalid"' } as any);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toMatchObject({
      code: 400,
      message: "Invalid JSON body",
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns 400 when missing origin or destination/distanceKm", async () => {
    mockSend.mockResolvedValueOnce({});
    const res1 = await handler({ headers: { Accept: "application/json" }, body: JSON.stringify({ destination: "B" }) } as any);
    expect(res1.statusCode).toBe(400);
    expect(JSON.parse(res1.body)).toMatchObject({
      code: 400,
      message: "Must provide origin and (destination OR distanceKm)",
    });
    const res2 = await handler({ headers: { Accept: "application/json" }, body: JSON.stringify({ origin: "A" }) } as any);
    expect(res2.statusCode).toBe(400);
    expect(JSON.parse(res2.body)).toMatchObject({
      code: 400,
      message: "Must provide origin and (destination OR distanceKm)",
    });
  });

  it("returns 400 when distanceKm is out of range", async () => {
    const res = await handler({
      headers: { Accept: "application/json" },
      body: JSON.stringify({ origin: "A", distanceKm: 101 }),
    } as any);

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toMatchObject({
      code: 400,
      message: "distanceKm must be between 1 and 100",
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("forwards distanceKm when within range", async () => {
    mockSend.mockResolvedValueOnce({});
    await handler({
      headers: { Accept: "application/json" },
      body: JSON.stringify({ origin: "A", distanceKm: 50 }),
    } as any);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(mockSend.mock.calls[0][0]);
    expect(payload.distanceKm).toBe(50);
  });

  it("forwards routesCount when provided", async () => {
    mockSend.mockResolvedValueOnce({});
    await handler({
      headers: { Accept: "application/json" },
      body: JSON.stringify({ origin: "A", destination: "B", routesCount: 3 }),
    } as any);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(mockSend.mock.calls[0][0]);
    expect(payload.routesCount).toBe(3);
  });

  it("forwards preference when provided", async () => {
    mockSend.mockResolvedValueOnce({});
    await handler({
      headers: { Accept: "application/json" },
      body: JSON.stringify({ origin: "A", destination: "B", preference: "park" }),
    } as any);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(mockSend.mock.calls[0][0]);
    expect(payload.preference).toBe("park");
  });
});

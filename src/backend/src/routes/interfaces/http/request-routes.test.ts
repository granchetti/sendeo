import { createRequestRoutesHandler } from "./request-routes";
import { RequestRoutesUseCase } from "../../application/use-cases/request-routes";
import {
  InMemoryEventDispatcher,
} from "../../../shared/domain/events/event-dispatcher";
import { UUID } from "../../../shared/domain/value-objects/uuid";
import type { RouteRepository } from "../../domain/repositories/route-repository";
import type { RouteRequestQueue } from "../../domain/queues/route-request-queue";

const mockSend = jest.fn();
const queue: RouteRequestQueue = { send: mockSend };
const repo: RouteRepository = { save: jest.fn() } as any;

function buildHandler() {
  const dispatcher = new InMemoryEventDispatcher();
  dispatcher.subscribe("RouteRequested", async (event: any) => {
    await queue.send(
      JSON.stringify({ eventName: event.eventName, routeId: event.routeId.Value }),
    );
  });
  const useCase = new RequestRoutesUseCase(repo, dispatcher);
  return createRequestRoutesHandler(useCase);
}

beforeEach(() => {
  mockSend.mockReset();
  (repo.save as jest.Mock).mockReset();
});

describe("request routes handler", () => {
  it("generates identifiers and publishes event", async () => {
    mockSend.mockResolvedValueOnce({});
    const handler = buildHandler();
    const res = await handler({
      headers: { Accept: "application/json" },
      body: JSON.stringify({ origin: "A", destination: "B" }),
    } as any);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(mockSend.mock.calls[0][0]);
    expect(payload.eventName).toBe("RouteRequested");
    expect(payload.routeId).toMatch(/^[0-9a-f-]{36}$/);
    const body = JSON.parse(res.body);
    expect(body.jobId).toMatch(/^[0-9a-f-]{36}$/);
    const saved = (repo.save as jest.Mock).mock.calls[0][0];
    expect(saved.correlationId.Value).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("keeps provided jobId and correlationId", async () => {
    mockSend.mockResolvedValueOnce({});
    const handler = buildHandler();
    const jobId = UUID.generate().Value;
    const correlationId = UUID.generate().Value;
    const res = await handler({
      headers: { Accept: "application/json" },
      body: JSON.stringify({
        origin: "A",
        destination: "B",
        jobId,
        correlationId,
      }),
    } as any);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const body = JSON.parse(res.body);
    expect(body.jobId).toBe(jobId);
    const saved = (repo.save as jest.Mock).mock.calls[0][0];
    expect(saved.correlationId.Value).toBe(correlationId);
  });

  it("returns 400 when body parsing fails", async () => {
    const handler = buildHandler();
    const res = await handler({
      headers: { Accept: "application/json" },
      body: '{"invalid"',
    } as any);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toMatchObject({
      code: 400,
      message: "Invalid JSON body",
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns 400 when missing origin or destination/distanceKm", async () => {
    const handler = buildHandler();
    const res1 = await handler({
      headers: { Accept: "application/json" },
      body: JSON.stringify({ destination: "B" }),
    } as any);
    expect(res1.statusCode).toBe(400);
    const res2 = await handler({
      headers: { Accept: "application/json" },
      body: JSON.stringify({ origin: "A" }),
    } as any);
    expect(res2.statusCode).toBe(400);
  });

  it("returns 400 when distanceKm is out of range", async () => {
    const handler = buildHandler();
    const res = await handler({
      headers: { Accept: "application/json" },
      body: JSON.stringify({ origin: "A", distanceKm: 101 }),
    } as any);
    expect(res.statusCode).toBe(400);
    expect(mockSend).not.toHaveBeenCalled();
  });
});


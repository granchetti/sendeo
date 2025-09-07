import { rateLimit, resetRateLimit } from "../../src/http/rate-limit";

const baseEvent: any = {
  requestContext: { identity: { sourceIp: "1.1.1.1" } },
};

describe("rate limit middleware", () => {
  beforeEach(() => {
    resetRateLimit();
  });

  it("returns 429 with Retry-After when limit exceeded", async () => {
    const handler = rateLimit(async () => ({ statusCode: 200, headers: {}, body: "" }), {
      limit: 2,
      windowMs: 60_000,
    });
    await handler(baseEvent);
    await handler(baseEvent);
    const res = await handler(baseEvent);
    expect(res.statusCode).toBe(429);
    expect(res.headers["Retry-After"]).toBeDefined();
  });

  it("logs attempts", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const handler = rateLimit(async () => ({ statusCode: 200, headers: {}, body: "" }), {
      limit: 5,
      windowMs: 60_000,
    });
    await handler(baseEvent);
    expect(logSpy).toHaveBeenCalledWith("rate-limit:1.1.1.1:1");
    logSpy.mockRestore();
  });

  it("handles high traffic by blocking excess requests", async () => {
    const handler = rateLimit(async () => ({ statusCode: 200, headers: {}, body: "" }), {
      limit: 10,
      windowMs: 60_000,
    });
    const requests = Array.from({ length: 15 }, () => handler(baseEvent));
    const responses = await Promise.all(requests);
    const overLimit = responses.filter((r) => r.statusCode === 429).length;
    expect(overLimit).toBe(5);
  });
});

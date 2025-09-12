import {
  rateLimit,
  resetRateLimit,
  getAttemptsCount,
  CLEANUP_INTERVAL,
} from "../../src/http/rate-limit";
import { createHash } from "node:crypto";

const baseEvent: any = {
  requestContext: { identity: { sourceIp: "1.1.1.1" } },
};

describe("rate limit middleware", () => {
  beforeEach(() => {
    resetRateLimit();
    process.env.RATE_LIMIT_SALT = "test-salt";
  });

  afterEach(() => {
    delete process.env.RATE_LIMIT_SALT;
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
    expect(res.headers!["Retry-After"]).toBeDefined();
  });

  it("logs attempts", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const handler = rateLimit(async () => ({ statusCode: 200, headers: {}, body: "" }), {
      limit: 5,
      windowMs: 60_000,
    });
    await handler(baseEvent);
    const expectedKey = createHash("sha256")
      .update("1.1.1.1" + process.env.RATE_LIMIT_SALT!)
      .digest("hex");
    expect(logSpy).toHaveBeenCalledWith(`rate-limit:${expectedKey}:1`);
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

  it("cleans up expired attempts", async () => {
    const handler = rateLimit(async () => ({ statusCode: 200, headers: {}, body: "" }), {
      limit: CLEANUP_INTERVAL + 10,
      windowMs: 10,
    });

    for (let i = 0; i < 5; i++) {
      await handler({ requestContext: { identity: { sourceIp: `2.2.2.${i}` } } } as any);
    }
    expect(getAttemptsCount()).toBe(5);

    await new Promise((r) => setTimeout(r, 20));

    for (let i = 0; i < CLEANUP_INTERVAL - 5; i++) {
      await handler({ requestContext: { identity: { sourceIp: "9.9.9.9" } } } as any);
    }

    expect(getAttemptsCount()).toBe(1);
  });
});

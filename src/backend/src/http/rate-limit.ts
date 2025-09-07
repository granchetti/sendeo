import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
  keyGenerator?: (event: APIGatewayProxyEvent) => string;
}

type Handler = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

const attempts = new Map<string, { count: number; expiresAt: number }>();

export const rateLimit = (
  handler: Handler,
  { limit = 100, windowMs = 60_000, keyGenerator }: RateLimitOptions = {}
): Handler => {
  return async (
    event: APIGatewayProxyEvent
  ): Promise<APIGatewayProxyResult> => {
    const key = keyGenerator
      ? keyGenerator(event)
      : (event.requestContext as any)?.authorizer?.claims?.sub ||
        (event.requestContext as any)?.identity?.sourceIp ||
        "unknown";

    const now = Date.now();
    const record = attempts.get(key);
    if (!record || now > record.expiresAt) {
      attempts.set(key, { count: 1, expiresAt: now + windowMs });
    } else {
      record.count += 1;
    }

    const current = attempts.get(key)!;
    console.log(`rate-limit:${key}:${current.count}`);
    if (current.count > limit) {
      const retryAfter = Math.ceil((current.expiresAt - now) / 1000);
      return {
        statusCode: 429,
        headers: { "Retry-After": String(retryAfter) },
        body: JSON.stringify({ error: "Too Many Requests" }),
      };
    }

    return handler(event);
  };
};

export const resetRateLimit = () => {
  attempts.clear();
};

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createHash } from "node:crypto";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

export interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
  keyGenerator?: (event: APIGatewayProxyEvent) => string;
}

type Handler = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

const attempts = new Map<string, { count: number; expiresAt: number }>();
export const CLEANUP_INTERVAL = parseInt(
  process.env.RATE_LIMIT_CLEANUP_EVERY || "100",
  10
);
let requestsSinceCleanup = 0;

// Lazily fetch and cache the salt used for hashing rate limit identifiers.
const sm = new SecretsManagerClient({});
let cachedSalt: string | null = null;
async function getSalt(): Promise<string> {
  if (cachedSalt) return cachedSalt;
  if (process.env.RATE_LIMIT_SALT) {
    cachedSalt = process.env.RATE_LIMIT_SALT;
    return cachedSalt;
  }
  try {
    const resp = await sm.send(
      new GetSecretValueCommand({ SecretId: "rate-limit-salt" })
    );
    cachedSalt = JSON.parse(resp.SecretString!).RATE_LIMIT_SALT;
    return cachedSalt;
  } catch (err) {
    console.warn("[rateLimit] unable to retrieve salt", err);
    cachedSalt = "";
    return cachedSalt;
  }
}

export const rateLimit = (
  handler: Handler,
  { limit = 100, windowMs = 60_000, keyGenerator }: RateLimitOptions = {}
): Handler => {
  return async (
    event: APIGatewayProxyEvent
  ): Promise<APIGatewayProxyResult> => {
    const rawKey = keyGenerator
      ? keyGenerator(event)
      : (event.requestContext as any)?.authorizer?.claims?.sub ||
        (event.requestContext as any)?.identity?.sourceIp ||
        "unknown";

    // Hash the identifier with a salt so logs don't contain raw user data.
    const key = createHash("sha256")
      .update(rawKey + (await getSalt()))
      .digest("hex");

    const now = Date.now();

    // Periodically remove expired attempts to avoid memory leaks.
    requestsSinceCleanup++;
    if (requestsSinceCleanup % CLEANUP_INTERVAL === 0) {
      for (const [k, v] of attempts) {
        if (v.expiresAt < now) {
          attempts.delete(k);
        }
      }
    }

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
  cachedSalt = null;
};

// Exposed for testing.
export const getAttemptsCount = () => attempts.size;

import { Redis } from "@upstash/redis";
import { logEvent } from "./observability";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let redis: Redis | null | undefined;
let fallbackReported = false;

const FIXED_WINDOW_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return {count, ttl}
`;

export interface RateLimitResult {
  ok: boolean;
  retryAfterMs: number;
  remaining: number;
  backend: "redis" | "memory";
}

function redisClient(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

export function distributedRateLimitConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

export function rateLimitMemory(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return {
      ok: true,
      retryAfterMs: 0,
      remaining: Math.max(0, limit - 1),
      backend: "memory",
    };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      retryAfterMs: bucket.resetAt - now,
      remaining: 0,
      backend: "memory",
    };
  }

  bucket.count += 1;
  return {
    ok: true,
    retryAfterMs: 0,
    remaining: Math.max(0, limit - bucket.count),
    backend: "memory",
  };
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const client = redisClient();
  if (client) {
    try {
      const [count, ttl] = await client.eval<
        [number],
        [number, number]
      >(FIXED_WINDOW_SCRIPT, [`v1:ratelimit:${key}`], [windowMs]);
      return {
        ok: count <= limit,
        retryAfterMs: count > limit ? Math.max(0, ttl) : 0,
        remaining: Math.max(0, limit - count),
        backend: "redis",
      };
    } catch (error) {
      logEvent("error", "rate_limit.redis_failed", {
        error: error instanceof Error ? error.name : "UnknownError",
      });
    }
  } else if (!fallbackReported) {
    fallbackReported = true;
    logEvent("warn", "rate_limit.memory_fallback", {
      environment: process.env.NODE_ENV ?? "unknown",
    });
  }

  // Availability-first fallback. It still protects a single instance while a
  // Redis outage is handled, without turning that outage into a total API loss.
  return rateLimitMemory(key, limit, windowMs);
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  const headers: Record<string, string> = {
    "x-ratelimit-remaining": String(result.remaining),
  };
  if (!result.ok) {
    headers["retry-after"] = String(Math.max(1, Math.ceil(result.retryAfterMs / 1000)));
  }
  return headers;
}

export function withRateLimitHeaders<T extends Response>(
  response: T,
  result: RateLimitResult,
): T {
  response.headers.set("x-ratelimit-remaining", String(result.remaining));
  if (!result.ok) {
    response.headers.set(
      "retry-after",
      String(Math.max(1, Math.ceil(result.retryAfterMs / 1000))),
    );
  }
  return response;
}

export function clientKey(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || "unknown";
}

export function resetRateLimitStateForTests(): void {
  buckets.clear();
  redis = undefined;
  fallbackReported = false;
}

export const RATE_LIMIT = {
  createMeeting: { limit: 12, windowMs: 60_000 },
  livekitToken: { limit: 30, windowMs: 60_000 },
  join: { limit: 30, windowMs: 60_000 },
  endMeeting: { limit: 6, windowMs: 60_000 },
} as const;

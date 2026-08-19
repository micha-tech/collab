/**
 * Minimal, dependency-free rate limiter.
 *
 * For MVPV1 memory-only bucketed limiter per serverless function instance.
 * On Vercel this is best-effort (each lambda keeps its own counters). The API is
 * intentionally small so it can be swapped for a shared store (e.g. Upstash KV
 * or Vercel KV) without touching callers.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  retryAfterMs: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { ok: true, retryAfterMs: 0 };
}

export function clientKey(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  const ip = xff?.split(",")[0]?.trim() ?? "unknown";
  return ip;
}

// Endpoint budget constants. Conservative defaults; guests are throttled
// harder than registered hosts.
export const RATE_LIMIT = {
  createMeeting: { limit: 12, windowMs: 60_000 },
  livekitToken: { limit: 30, windowMs: 60_000 },
  join: { limit: 30, windowMs: 60_000 },
  endMeeting: { limit: 6, windowMs: 60_000 },
} as const;
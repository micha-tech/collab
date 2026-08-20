import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  rateLimitHeaders,
  rateLimitMemory,
  resetRateLimitStateForTests,
} from "./rate-limit";

describe("rate limiting", () => {
  beforeEach(resetRateLimitStateForTests);
  afterEach(resetRateLimitStateForTests);

  it("allows requests within a fixed window", () => {
    expect(rateLimitMemory("join:test", 2, 1_000, 100).ok).toBe(true);
    const second = rateLimitMemory("join:test", 2, 1_000, 200);
    expect(second).toMatchObject({ ok: true, remaining: 0 });
  });

  it("blocks excess requests and reports reset time", () => {
    rateLimitMemory("join:test", 1, 1_000, 100);
    const blocked = rateLimitMemory("join:test", 1, 1_000, 250);
    expect(blocked).toMatchObject({ ok: false, retryAfterMs: 850, remaining: 0 });
    expect(rateLimitHeaders(blocked)).toMatchObject({ "retry-after": "1" });
  });

  it("starts a fresh bucket after expiry", () => {
    rateLimitMemory("join:test", 1, 1_000, 100);
    expect(rateLimitMemory("join:test", 1, 1_000, 1_101).ok).toBe(true);
  });
});

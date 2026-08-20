import { describe, expect, it } from "vitest";
import { requestIdFor, withRequestId } from "./observability";
import { NextResponse } from "next/server";

describe("request correlation", () => {
  it("preserves a valid upstream request id", () => {
    const request = new Request("https://example.test", {
      headers: { "x-request-id": "edge-request-123" },
    });
    expect(requestIdFor(request)).toBe("edge-request-123");
  });

  it("replaces malformed request ids", () => {
    const request = new Request("https://example.test", {
      headers: { "x-request-id": "bad id" },
    });
    expect(requestIdFor(request)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("adds correlation and no-store headers", () => {
    const response = withRequestId(NextResponse.json({ ok: true }), "request-123");
    expect(response.headers.get("x-request-id")).toBe("request-123");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});

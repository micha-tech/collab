import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

type LogLevel = "info" | "warn" | "error";
type LogFields = Record<string, string | number | boolean | null | undefined>;

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,128}$/;

export function requestIdFor(request: Request): string {
  const supplied = request.headers.get("x-request-id")?.trim();
  return supplied && REQUEST_ID_PATTERN.test(supplied) ? supplied : randomUUID();
}

export function withRequestId<T extends NextResponse>(
  response: T,
  requestId: string,
): T {
  response.headers.set("x-request-id", requestId);
  response.headers.set("cache-control", "no-store");
  return response;
}

export function jsonResponse(
  body: unknown,
  requestId: string,
  init?: ResponseInit,
): NextResponse {
  return withRequestId(NextResponse.json(body, init), requestId);
}

export function logEvent(
  level: LogLevel,
  event: string,
  fields: LogFields = {},
): void {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...fields,
  });

  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

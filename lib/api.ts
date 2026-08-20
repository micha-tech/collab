import { NextResponse } from "next/server";
import type { ApiErrorBody } from "@/types";
import { withRequestId } from "@/lib/observability";

export function jsonError(
  error: string,
  status: number,
  code?: ApiErrorBody["code"],
  requestId?: string,
) {
  const response = NextResponse.json({ error, code } satisfies ApiErrorBody, {
    status,
  });
  return requestId ? withRequestId(response, requestId) : response;
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

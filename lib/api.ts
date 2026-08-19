import { NextResponse } from "next/server";
import type { ApiErrorBody } from "@/types";

export function jsonError(
  error: string,
  status: number,
  code?: ApiErrorBody["code"],
) {
  return NextResponse.json({ error, code } satisfies ApiErrorBody, {
    status,
  });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
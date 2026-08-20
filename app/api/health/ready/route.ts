import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/config";
import {
  jsonResponse,
  logEvent,
  requestIdFor,
} from "@/lib/observability";
import { distributedRateLimitConfigured } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = requestIdFor(request);
  const startedAt = performance.now();
  const rateLimitConfigured = distributedRateLimitConfigured();

  if (process.env.NODE_ENV === "production" && !rateLimitConfigured) {
    logEvent("error", "health.rate_limit_not_configured", { requestId });
    return jsonResponse(
      {
        status: "not_ready",
        dependencies: {
          database: "unchecked",
          rateLimit: "unavailable",
        },
      },
      requestId,
      { status: 503 },
    );
  }

  try {
    // Validates all required server configuration without returning it.
    getServerEnv();
    const admin = createAdminClient();
    const { error } = await admin
      .from("meetings")
      .select("id")
      .limit(1)
      .abortSignal(AbortSignal.timeout(3_000));

    if (error) throw error;

    return jsonResponse(
      {
        status: "ready",
        dependencies: {
          database: "ok",
          livekitConfiguration: "ok",
          rateLimit: rateLimitConfigured ? "redis" : "memory",
        },
      },
      requestId,
    );
  } catch (error) {
    logEvent("error", "health.readiness_failed", {
      requestId,
      durationMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonResponse(
      {
        status: "not_ready",
        dependencies: { database: "unavailable" },
      },
      requestId,
      { status: 503 },
    );
  }
}

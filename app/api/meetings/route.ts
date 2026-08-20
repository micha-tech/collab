import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createMeetingSchema } from "@/lib/validation";
import { jsonError, readJson } from "@/lib/api";
import { rateLimit, clientKey, RATE_LIMIT, withRateLimitHeaders } from "@/lib/rate-limit";
import {
  createMeetingRecord,
} from "@/lib/db";
import {
  generateLiveKitRoomName,
  generateMeetingSlug,
  hashIpForLogs,
} from "@/lib/meetings";
import {
  jsonResponse,
  logEvent,
  requestIdFor,
} from "@/lib/observability";

export async function POST(request: Request) {
  const requestId = requestIdFor(request);
  const startedAt = performance.now();
  const ip = clientKey(request);
  const limited = await rateLimit(
    `create:${ip}`,
    RATE_LIMIT.createMeeting.limit,
    RATE_LIMIT.createMeeting.windowMs,
  );
  if (!limited.ok) {
    logEvent("warn", "meeting.create_rate_limited", { requestId });
    return withRateLimitHeaders(
      jsonError("Too many meeting requests. Try again shortly.", 429, undefined, requestId),
      limited,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Please sign in to create a meeting.", 401, "unauthorized", requestId);
  }
  if (user.is_anonymous) {
    return jsonError("Guest accounts can't create meetings. Create an account.", 403, "forbidden", requestId);
  }

  const body = await readJson(request);
  const parsed = createMeetingSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Invalid meeting title.",
      400,
      undefined,
      requestId,
    );
  }

  const meetingId = randomUUID();
  const slug = generateMeetingSlug();
  const livekitRoomName = generateLiveKitRoomName();

  const meeting = await createMeetingRecord({
    id: meetingId,
    slug,
    title: parsed.data.title,
    livekitRoomName,
    displayName: user.user_metadata?.display_name || "Host",
    allowGuests: parsed.data.allowGuests,
    client: supabase,
  });

  if (!meeting) {
    logEvent("error", "meeting.create_failed", { requestId });
    return jsonError("Couldn't create the meeting. Please try again.", 500, undefined, requestId);
  }

  logEvent("info", "meeting.created", {
    requestId,
    meetingSlug: meeting.slug,
    actor: user.id.slice(0, 8),
    ipHash: hashIpForLogs(ip),
    allowGuests: parsed.data.allowGuests,
    durationMs: Math.round(performance.now() - startedAt),
  });

  return jsonResponse(
    {
      meeting: {
        id: meeting.id,
        slug: meeting.slug,
        title: meeting.title,
      },
    },
    requestId,
  );
}

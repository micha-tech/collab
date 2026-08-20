import { createClient } from "@/lib/supabase/server";
import { joinMeetingSchema } from "@/lib/validation";
import { jsonError, readJson } from "@/lib/api";
import { rateLimit, clientKey, RATE_LIMIT, withRateLimitHeaders } from "@/lib/rate-limit";
import { getMeetingBySlug, joinMeetingParticipant } from "@/lib/db";
import {
  canJoinMeeting,
  generateParticipantIdentity,
  hashIpForLogs,
} from "@/lib/meetings";
import {
  jsonResponse,
  logEvent,
  requestIdFor,
} from "@/lib/observability";
import type { ApiErrorBody } from "@/types";

/**
 * Server-mediated join.
 * - Ensures the visitor has a session (starting an anonymous one for guests —
 *   internally, never surfaced to the user).
 * - Records membership in meeting_participants.
 * - Never trusts a client-supplied user ID / role / room name.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const requestId = requestIdFor(request);
  const startedAt = performance.now();
  const fail = (
    message: string,
    status: number,
    code?: ApiErrorBody["code"],
  ) => jsonError(message, status, code, requestId);
  const ip = clientKey(request);
  const limited = await rateLimit(
    `join:${ip}`,
    RATE_LIMIT.join.limit,
    RATE_LIMIT.join.windowMs,
  );
  if (!limited.ok) {
    logEvent("warn", "meeting.join_rate_limited", { requestId });
    return withRateLimitHeaders(
      fail("Too many join attempts. Try again shortly.", 429),
      limited,
    );
  }

  const body = await readJson(request);
  const { slug } = await params;
  const parsed = joinMeetingSchema.safeParse({
    ...(body as Record<string, unknown>),
    slug,
  });
  if (!parsed.success) {
    return fail(
      parsed.error.issues[0]?.message ?? "Invalid join request.",
      400,
    );
  }

  const supabase = await createClient();
  let {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const { data: anon, error: anonError } = await supabase.auth.signInAnonymously();
    if (anonError || !anon.user) {
      logEvent("error", "meeting.anonymous_session_failed", {
        requestId,
        authCode: anonError?.code,
      });
      return fail("Couldn't start a session. Please try again.", 500);
    }
    user = anon.user;
  }

  const meeting = await getMeetingBySlug(parsed.data.slug);
  if (!meeting) {
    return fail("Meeting not found.", 404, "meeting_not_found");
  }
  if (meeting.status !== "active") {
    return fail("This meeting has ended.", 410, "meeting_ended");
  }

  const isHost = meeting.host_id === user.id;
  if (
    !canJoinMeeting({
      isHost,
      isAnonymous: Boolean(user.is_anonymous),
      allowGuests: meeting.allow_guests,
    })
  ) {
    return fail("Joining this meeting was disabled by the host.", 403);
  }

  const role = isHost ? "host" : "participant";
  const displayName = parsed.data.displayName;

  const participant = await joinMeetingParticipant({
    meetingId: meeting.id,
    displayName,
    client: supabase,
  });

  if (!participant) {
    logEvent("error", "meeting.join_persistence_failed", { requestId });
    return fail("Couldn't record your join. Please try again.", 500);
  }

  logEvent("info", "meeting.joined", {
    requestId,
    meetingSlug: meeting.slug,
    actor: user.id.slice(0, 8),
    ipHash: hashIpForLogs(ip),
    anonymous: Boolean(user.is_anonymous),
    role,
    durationMs: Math.round(performance.now() - startedAt),
  });

  return jsonResponse(
    {
      participant: {
        id: participant.id,
        display_name: participant.display_name,
        role,
      },
      meeting: {
        id: meeting.id,
        slug: meeting.slug,
        title: meeting.title,
        status: meeting.status,
      },
      identity: generateParticipantIdentity(user.id),
    },
    requestId,
  );
}

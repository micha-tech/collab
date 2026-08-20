import { livekitTokenSchema } from "@/lib/validation";
import { jsonError, readJson } from "@/lib/api";
import { rateLimit, clientKey, RATE_LIMIT, withRateLimitHeaders } from "@/lib/rate-limit";
import { joinMeetingParticipant } from "@/lib/db";
import { issueLiveKitToken, livekitServerUrl } from "@/lib/livekit/server";
import {
  generateParticipantIdentity,
  hashIpForLogs,
} from "@/lib/meetings";
import {
  getMeetingAccessContext,
  mayEnterMeeting,
} from "@/lib/auth/meeting-access";
import type { MeetingRole } from "@/types";
import type { ApiErrorBody } from "@/types";
import {
  jsonResponse,
  logEvent,
  requestIdFor,
} from "@/lib/observability";

/**
 * Issues a signed LiveKit Access Token.
 * The server decides the room, role and permissions — the client only supplies
 * the meeting slug and display name.
 */
export async function POST(request: Request) {
  const requestId = requestIdFor(request);
  const startedAt = performance.now();
  const fail = (
    message: string,
    status: number,
    code?: ApiErrorBody["code"],
  ) => jsonError(message, status, code, requestId);
  const ip = clientKey(request);
  const limited = await rateLimit(
    `token:${ip}`,
    RATE_LIMIT.livekitToken.limit,
    RATE_LIMIT.livekitToken.windowMs,
  );
  if (!limited.ok) {
    logEvent("warn", "livekit.token_rate_limited", { requestId });
    return withRateLimitHeaders(
      fail("Too many requests. Try again shortly.", 429),
      limited,
    );
  }

  const body = await readJson(request);
  const parsed = livekitTokenSchema.safeParse(body);
  if (!parsed.success) {
    return fail(
      parsed.error.issues[0]?.message ?? "Invalid token request.",
      400,
    );
  }

  const context = await getMeetingAccessContext(parsed.data.meetingSlug);
  const { meeting, user, isHost } = context;

  if (!user) {
    return fail("Join the meeting first.", 401, "unauthorized");
  }

  if (!meeting) {
    return fail("Meeting not found.", 404, "meeting_not_found");
  }
  if (meeting.status !== "active") {
    return fail("This meeting has ended.", 410, "meeting_ended");
  }

  if (!mayEnterMeeting(context)) {
    return fail("Joining this meeting was disabled by the host.", 403);
  }

  const role: MeetingRole = isHost ? "host" : "participant";
  const displayName = parsed.data.displayName;

  const participant = await joinMeetingParticipant({
    meetingId: meeting.id,
    displayName,
  });

  if (!participant) {
    logEvent("error", "livekit.token_membership_failed", { requestId });
    return fail("Couldn't prepare your connection. Please try again.", 500);
  }

  const identity = generateParticipantIdentity(user.id);
  const token = await issueLiveKitToken({
    roomName: meeting.livekit_room_name,
    identity,
    role,
    displayName,
    userId: user.id,
    meetingId: meeting.id,
  });

  logEvent("info", "livekit.token_issued", {
    requestId,
    meetingSlug: meeting.slug,
    actor: user.id.slice(0, 8),
    ipHash: hashIpForLogs(ip),
    role,
    durationMs: Math.round(performance.now() - startedAt),
  });

  return jsonResponse(
    {
      token,
      serverUrl: livekitServerUrl(),
      roomName: meeting.livekit_room_name,
      identity,
      role,
    },
    requestId,
  );
}

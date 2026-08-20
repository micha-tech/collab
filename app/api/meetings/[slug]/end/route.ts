import { NextResponse } from "next/server";
import { meetingSlugSchema } from "@/lib/validation";
import { jsonError } from "@/lib/api";
import { rateLimit, clientKey, RATE_LIMIT, withRateLimitHeaders } from "@/lib/rate-limit";
import { endMeetingRecord } from "@/lib/db";
import { closeLiveKitRoom } from "@/lib/livekit/server";
import { hashIpForLogs } from "@/lib/meetings";
import { getMeetingAccessContext } from "@/lib/auth/meeting-access";

/**
 * Host-only "end meeting for everyone".
 * A normal participant or guest cannot end a meeting.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const ip = clientKey(request);
  const limited = await rateLimit(
    `end:${ip}`,
    RATE_LIMIT.endMeeting.limit,
    RATE_LIMIT.endMeeting.windowMs,
  );
  if (!limited.ok) {
    return withRateLimitHeaders(
      jsonError("Too many requests. Try again shortly.", 429),
      limited,
    );
  }

  const { slug } = await params;
  const parsed = meetingSlugSchema.safeParse(slug);
  if (!parsed.success) {
    return jsonError("Meeting not found.", 404, "meeting_not_found");
  }

  const { meeting, user, isHost } = await getMeetingAccessContext(parsed.data);

  if (!user || user.is_anonymous) {
    return jsonError("Only the meeting host can end this meeting.", 403, "forbidden");
  }

  if (!meeting) {
    return jsonError("Meeting not found.", 404, "meeting_not_found");
  }
  if (!isHost) {
    return jsonError("Only the meeting host can end this meeting.", 403, "forbidden");
  }
  if (meeting.status !== "active") {
    return NextResponse.json({
      ok: true,
      meeting: {
        id: meeting.id,
        slug: meeting.slug,
        status: meeting.status,
        ended_at: meeting.ended_at,
      },
    });
  }

  // Persist the terminal state before performing the external side effect.
  // If LiveKit deletion is delayed or fails, no new tokens can be issued and
  // retrying this endpoint remains safe.
  const updated = await endMeetingRecord(meeting.id);
  if (!updated) {
    return jsonError("Couldn't end the meeting. Please try again.", 500);
  }

  await closeLiveKitRoom(meeting.livekit_room_name);

  console.info(
    `endMeeting ok slug=${meeting.slug} host=${user.id.slice(0, 8)} ip=${hashIpForLogs(
      ip,
    )}`,
  );

  return NextResponse.json({
    ok: true,
    meeting: {
      id: updated.id,
      slug: updated.slug,
      status: updated.status,
      ended_at: updated.ended_at,
    },
  });
}

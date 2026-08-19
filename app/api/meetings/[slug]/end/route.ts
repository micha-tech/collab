import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { meetingSlugSchema } from "@/lib/validation";
import { jsonError } from "@/lib/api";
import { rateLimit, clientKey, RATE_LIMIT } from "@/lib/rate-limit";
import { endMeetingRecord, getMeetingBySlug } from "@/lib/db";
import { closeLiveKitRoom } from "@/lib/livekit/server";
import { hashIpForLogs } from "@/lib/meetings";

/**
 * Host-only "end meeting for everyone".
 * A normal participant or guest cannot end a meeting.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const ip = clientKey(request);
  const limited = rateLimit(
    `end:${ip}`,
    RATE_LIMIT.endMeeting.limit,
    RATE_LIMIT.endMeeting.windowMs,
  );
  if (!limited.ok) {
    return jsonError("Too many requests. Try again shortly.", 429);
  }

  const { slug } = await params;
  const parsed = meetingSlugSchema.safeParse(slug);
  if (!parsed.success) {
    return jsonError("Meeting not found.", 404, "meeting_not_found");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.is_anonymous) {
    return jsonError("Only the meeting host can end this meeting.", 403, "forbidden");
  }

  const meeting = await getMeetingBySlug(parsed.data);
  if (!meeting) {
    return jsonError("Meeting not found.", 404, "meeting_not_found");
  }
  if (meeting.host_id !== user.id) {
    return jsonError("Only the meeting host can end this meeting.", 403, "forbidden");
  }
  if (meeting.status !== "active") {
    return jsonError("This meeting has already ended.", 410, "meeting_ended");
  }

  await closeLiveKitRoom(meeting.livekit_room_name);

  const updated = await endMeetingRecord(meeting.id);
  if (!updated) {
    return jsonError("Couldn't end the meeting. Please try again.", 500);
  }

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
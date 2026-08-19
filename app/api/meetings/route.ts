import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createMeetingSchema } from "@/lib/validation";
import { jsonError, readJson } from "@/lib/api";
import { rateLimit, clientKey, RATE_LIMIT } from "@/lib/rate-limit";
import {
  createMeetingRecord,
  upsertParticipant,
} from "@/lib/db";
import {
  generateLiveKitRoomName,
  generateMeetingSlug,
  hashIpForLogs,
} from "@/lib/meetings";
import type { MeetingRole } from "@/types";

export async function POST(request: Request) {
  const ip = clientKey(request);
  const limited = rateLimit(
    `create:${ip}`,
    RATE_LIMIT.createMeeting.limit,
    RATE_LIMIT.createMeeting.windowMs,
  );
  if (!limited.ok) {
    return jsonError("Too many meeting requests. Try again shortly.", 429);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Please sign in to create a meeting.", 401, "unauthorized");
  }
  if (user.is_anonymous) {
    return jsonError("Guest accounts can't create meetings. Create an account.", 403, "forbidden");
  }

  const body = await readJson(request);
  const parsed = createMeetingSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Invalid meeting title.",
      400,
    );
  }

  const meetingId = randomUUID();
  const slug = generateMeetingSlug();
  const livekitRoomName = generateLiveKitRoomName();

  const meeting = await createMeetingRecord({
    id: meetingId,
    slug,
    title: parsed.data.title,
    hostId: user.id,
    livekitRoomName,
  });

  if (!meeting) {
    return jsonError("Couldn't create the meeting. Please try again.", 500);
  }

  const hostRole: MeetingRole = "host";
  const participant = await upsertParticipant({
    meetingId: meeting.id,
    userId: user.id,
    displayName: user.user_metadata?.display_name || "Host",
    role: hostRole,
  });

  if (!participant) {
    // Meeting exists but the host participant row failed — not fatal for the
    // meeting itself, but log it for investigation.
    console.error(
      `createMeeting: host participant insert failed for meeting ${meeting.id}`,
    );
  }

  console.info(
    `createMeeting ok slug=${meeting.slug} host=${user.id.slice(0, 8)} ip=${hashIpForLogs(ip)
    }`,
  );

  return NextResponse.json({
    meeting: {
      id: meeting.id,
      slug: meeting.slug,
      title: meeting.title,
    },
  });
}
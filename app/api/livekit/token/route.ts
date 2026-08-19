import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { livekitTokenSchema } from "@/lib/validation";
import { jsonError, readJson } from "@/lib/api";
import { rateLimit, clientKey, RATE_LIMIT } from "@/lib/rate-limit";
import { getMeetingBySlug, upsertParticipant } from "@/lib/db";
import { issueLiveKitToken, livekitServerUrl } from "@/lib/livekit/server";
import { generateParticipantIdentity, hashIpForLogs } from "@/lib/meetings";
import type { MeetingRole } from "@/types";

/**
 * Issues a signed LiveKit Access Token.
 * The server decides the room, role and permissions — the client only supplies
 * the meeting slug and display name.
 */
export async function POST(request: Request) {
  const ip = clientKey(request);
  const limited = rateLimit(
    `token:${ip}`,
    RATE_LIMIT.livekitToken.limit,
    RATE_LIMIT.livekitToken.windowMs,
  );
  if (!limited.ok) {
    return jsonError("Too many requests. Try again shortly.", 429);
  }

  const body = await readJson(request);
  const parsed = livekitTokenSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Invalid token request.",
      400,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Join the meeting first.", 401, "unauthorized");
  }

  const meeting = await getMeetingBySlug(parsed.data.meetingSlug);
  if (!meeting) {
    return jsonError("Meeting not found.", 404, "meeting_not_found");
  }
  if (meeting.status !== "active") {
    return jsonError("This meeting has ended.", 410, "meeting_ended");
  }

  const isHost = meeting.host_id === user.id;
  if (!isHost && !meeting.allow_guests) {
    return jsonError("Joining this meeting was disabled by the host.", 403);
  }

  const role: MeetingRole = isHost ? "host" : "participant";
  const displayName = parsed.data.displayName;

  const participant = await upsertParticipant({
    meetingId: meeting.id,
    userId: user.id,
    displayName,
    role,
  });

  if (!participant) {
    return jsonError("Couldn't prepare your connection. Please try again.", 500);
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

  console.info(
    `token ok slug=${meeting.slug} user=${user.id.slice(0, 8)} ipc=${hashIpForLogs(
      ip,
    )} role=${role}`,
  );

  return NextResponse.json({
    token,
    serverUrl: livekitServerUrl(),
    roomName: meeting.livekit_room_name,
    identity,
    role,
  });
}
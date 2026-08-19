import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { joinMeetingSchema } from "@/lib/validation";
import { jsonError, readJson } from "@/lib/api";
import { rateLimit, clientKey, RATE_LIMIT } from "@/lib/rate-limit";
import { getMeetingBySlug, upsertParticipant } from "@/lib/db";
import { generateParticipantIdentity, hashIpForLogs } from "@/lib/meetings";
import type { MeetingRole } from "@/types";

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
  const ip = clientKey(request);
  const limited = rateLimit(
    `join:${ip}`,
    RATE_LIMIT.join.limit,
    RATE_LIMIT.join.windowMs,
  );
  if (!limited.ok) {
    return jsonError("Too many join attempts. Try again shortly.", 429);
  }

  const body = await readJson(request);
  const { slug } = await params;
  const parsed = joinMeetingSchema.safeParse({
    ...(body as Record<string, unknown>),
    slug,
  });
  if (!parsed.success) {
    return jsonError(
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
      console.error("join: anonymous sign-in failed", anonError?.message);
      return jsonError("Couldn't start a session. Please try again.", 500);
    }
    user = anon.user;
  }

  const meeting = await getMeetingBySlug(parsed.data.slug);
  if (!meeting) {
    return jsonError("Meeting not found.", 404, "meeting_not_found");
  }
  if (meeting.status !== "active") {
    return jsonError("This meeting has ended.", 410, "meeting_ended");
  }

  const isHost = meeting.host_id === user.id;
  if (!isHost && !meeting.allow_guests && !user.is_anonymous) {
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
    return jsonError("Couldn't record your join. Please try again.", 500);
  }

  console.info(
    `join ok slug=${meeting.slug} user=${user.id.slice(0, 8)} ipc=${hashIpForLogs(
      ip,
    )} anon=${Boolean(user.is_anonymous)} role=${role}`,
  );

  return NextResponse.json({
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
  });
}
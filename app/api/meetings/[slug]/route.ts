import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { meetingSlugSchema } from "@/lib/validation";
import { jsonError } from "@/lib/api";
import { getMeetingBySlug } from "@/lib/db";
import type { MeetingStatus } from "@/types";

/**
 * Public meeting metadata lookup. Used to render the lobby + ended screens
 * without exposing the supabase client to guests before they join.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const parsed = meetingSlugSchema.safeParse(slug);
  if (!parsed.success) {
    return jsonError("Meeting not found.", 404, "meeting_not_found");
  }

  const meeting = await getMeetingBySlug(parsed.data);
  if (!meeting) {
    return jsonError("Meeting not found.", 404, "meeting_not_found");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isHost = Boolean(user && user.id === meeting.host_id);

  return NextResponse.json({
    meeting: {
      id: meeting.id,
      slug: meeting.slug,
      title: meeting.title,
      status: meeting.status as MeetingStatus,
      allow_guests: meeting.allow_guests,
      host_id: meeting.host_id,
      created_at: meeting.created_at,
      ended_at: meeting.ended_at,
    },
    user: user
      ? { id: user.id, is_anonymous: Boolean(user.is_anonymous) }
      : null,
    isHost,
  });
}
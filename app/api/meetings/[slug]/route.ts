import { NextResponse } from "next/server";
import { meetingSlugSchema } from "@/lib/validation";
import { jsonError } from "@/lib/api";
import { getMeetingAccessContext } from "@/lib/auth/meeting-access";
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

  const { meeting, user, isHost } = await getMeetingAccessContext(parsed.data);
  if (!meeting) {
    return jsonError("Meeting not found.", 404, "meeting_not_found");
  }

  return NextResponse.json({
    meeting: {
      slug: meeting.slug,
      title: meeting.title,
      status: meeting.status as MeetingStatus,
      allow_guests: meeting.allow_guests,
    },
    user: user
      ? { is_anonymous: Boolean(user.is_anonymous) }
      : null,
    isHost,
  });
}

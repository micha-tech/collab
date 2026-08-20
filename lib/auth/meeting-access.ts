import "server-only";

import type { User } from "@supabase/supabase-js";
import { getMeetingBySlug } from "@/lib/db";
import { canJoinMeeting } from "@/lib/meetings";
import { createClient } from "@/lib/supabase/server";
import type { Meeting } from "@/types";

export interface MeetingAccessContext {
  meeting: Meeting | null;
  user: User | null;
  isHost: boolean;
}

/** Loads request identity and meeting state through one shared server boundary. */
export async function getMeetingAccessContext(
  slug: string,
): Promise<MeetingAccessContext> {
  const supabase = await createClient();
  const [meeting, userResult] = await Promise.all([
    getMeetingBySlug(slug),
    supabase.auth.getUser(),
  ]);
  const user = userResult.data.user;

  return {
    meeting,
    user,
    isHost: Boolean(meeting && user && meeting.host_id === user.id),
  };
}

export function mayEnterMeeting(
  context: Pick<MeetingAccessContext, "meeting" | "user" | "isHost">,
): boolean {
  if (!context.meeting || !context.user) return false;
  return canJoinMeeting({
    isHost: context.isHost,
    isAnonymous: Boolean(context.user.is_anonymous),
    allowGuests: context.meeting.allow_guests,
  });
}

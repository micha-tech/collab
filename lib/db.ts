import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";
import type { MeetingRow, MeetingParticipantRow } from "@/types/supabase";
import type { Meeting, MeetingParticipant } from "@/types";

export async function getMeetingBySlug(
  slug: string,
): Promise<Meeting | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meetings")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data as Meeting;
}

export async function getMeetingById(id: string): Promise<Meeting | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meetings")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as Meeting;
}

export async function joinMeetingParticipant(input: {
  meetingId: string;
  displayName: string;
  client?: SupabaseClient<Database>;
}): Promise<MeetingParticipant | null> {
  const client = input.client ?? (await createClient());
  const { data, error } = await client
    .rpc("join_meeting", {
      p_meeting_id: input.meetingId,
      p_display_name: input.displayName,
    })
    .single();

  if (error) {
    console.error("joinMeetingParticipant failed", error.message);
    return null;
  }
  return data as MeetingParticipant;
}

export async function getParticipant(
  meetingId: string,
  userId: string,
): Promise<MeetingParticipant | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meeting_participants")
    .select("*")
    .eq("meeting_id", meetingId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return null;
  return (data as MeetingParticipant | null) ?? null;
}

export async function createMeetingRecord(input: {
  id: string;
  slug: string;
  title: string;
  livekitRoomName: string;
  displayName: string;
  allowGuests: boolean;
  client: SupabaseClient<Database>;
}): Promise<Meeting | null> {
  const { data, error } = await input.client
    .rpc("create_meeting_with_host", {
      p_id: input.id,
      p_slug: input.slug,
      p_title: input.title,
      p_livekit_room_name: input.livekitRoomName,
      p_display_name: input.displayName,
      p_allow_guests: input.allowGuests,
    })
    .single();

  if (error) {
    console.error("createMeetingRecord failed", error.message);
    return null;
  }
  return data as Meeting;
}

export async function endMeetingRecord(
  meetingId: string,
): Promise<Meeting | null> {
  const client = await createClient();
  const { data, error } = await client
    .rpc("end_meeting", { p_meeting_id: meetingId })
    .single();

  if (error) {
    console.error("endMeetingRecord failed", error.message);
    return null;
  }
  return data as Meeting;
}

export async function listRecentMeetings(
  hostId: string,
  limit = 20,
): Promise<Meeting[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meetings")
    .select("*")
    .eq("host_id", hostId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("listRecentMeetings failed", error.message);
    return [];
  }
  return (data ?? []) as Meeting[];
}

export type { MeetingRow, MeetingParticipantRow };

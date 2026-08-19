import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { MeetingRow, MeetingParticipantRow } from "@/types/supabase";
import type { Meeting, MeetingParticipant, MeetingRole } from "@/types";

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

export async function upsertParticipant(input: {
  meetingId: string;
  userId: string;
  displayName: string;
  role: MeetingRole;
}): Promise<MeetingParticipant | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meeting_participants")
    .upsert(
      {
        meeting_id: input.meetingId,
        user_id: input.userId,
        display_name: input.displayName,
        role: input.role,
        joined_at: new Date().toISOString(),
      },
      { onConflict: "meeting_id,user_id" },
    )
    .select()
    .single();

  if (error) {
    console.error("upsertParticipant failed", error.message);
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
  hostId: string;
  livekitRoomName: string;
}): Promise<Meeting | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meetings")
    .insert({
      id: input.id,
      slug: input.slug,
      title: input.title,
      host_id: input.hostId,
      livekit_room_name: input.livekitRoomName,
    })
    .select()
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
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meetings")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", meetingId)
    .select()
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
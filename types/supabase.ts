import type { MeetingRole, MeetingStatus } from "@/types";

export type ProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  is_guest: boolean;
  created_at: string;
  updated_at: string;
}

export type MeetingRow = {
  id: string;
  slug: string;
  title: string;
  host_id: string;
  livekit_room_name: string;
  status: MeetingStatus;
  allow_guests: boolean;
  created_at: string;
  updated_at: string;
  ended_at: string | null;
}

export type MeetingParticipantRow = {
  id: string;
  meeting_id: string;
  user_id: string;
  display_name: string;
  role: MeetingRole;
  joined_at: string;
  left_at: string | null;
}

export type MessageRow = {
  id: string;
  meeting_id: string;
  sender_id: string;
  sender_name: string;
  body: string;
  created_at: string;
}

export type MeetingNotesRow = {
  meeting_id: string;
  state: number[];
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & Pick<ProfileRow, "id">;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      meetings: {
        Row: MeetingRow;
        Insert: Partial<MeetingRow> & Pick<MeetingRow, "slug" | "title" | "host_id" | "livekit_room_name">;
        Update: Partial<MeetingRow>;
        Relationships: [];
      };
      meeting_participants: {
        Row: MeetingParticipantRow;
        Insert: Partial<MeetingParticipantRow> &
          Pick<
            MeetingParticipantRow,
            "meeting_id" | "user_id" | "display_name" | "role"
          >;
        Update: Partial<MeetingParticipantRow>;
        Relationships: [];
      };
      messages: {
        Row: MessageRow;
        Insert: Pick<MessageRow, "meeting_id" | "sender_id" | "sender_name" | "body">;
        Update: Partial<MessageRow>;
        Relationships: [];
      };
      meeting_notes: {
        Row: MeetingNotesRow;
        Insert: Pick<MeetingNotesRow, "meeting_id"> & Partial<Pick<MeetingNotesRow, "state">>;
        Update: Partial<MeetingNotesRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
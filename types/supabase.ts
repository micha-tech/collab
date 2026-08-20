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

export type LiveKitWebhookEventRow = {
  id: string;
  event_type: string;
  received_at: string;
}

export type ParticipantSessionRow = {
  id: string;
  meeting_id: string;
  user_id: string | null;
  livekit_participant_sid: string;
  livekit_identity: string;
  display_name: string;
  region: string | null;
  joined_at: string;
  left_at: string | null;
  disconnect_reason: number | null;
  created_at: string;
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
      livekit_webhook_events: {
        Row: LiveKitWebhookEventRow;
        Insert: Pick<LiveKitWebhookEventRow, "id" | "event_type">;
        Update: never;
        Relationships: [];
      };
      participant_sessions: {
        Row: ParticipantSessionRow;
        Insert: Partial<ParticipantSessionRow> &
          Pick<ParticipantSessionRow, "meeting_id" | "livekit_participant_sid" | "livekit_identity" | "display_name" | "joined_at">;
        Update: Partial<ParticipantSessionRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_meeting_with_host: {
        Args: {
          p_id: string;
          p_slug: string;
          p_title: string;
          p_livekit_room_name: string;
          p_display_name: string;
          p_allow_guests: boolean;
        };
        Returns: MeetingRow[];
      };
      join_meeting: {
        Args: { p_meeting_id: string; p_display_name: string };
        Returns: MeetingParticipantRow[];
      };
      end_meeting: {
        Args: { p_meeting_id: string };
        Returns: MeetingRow[];
      };
      process_livekit_participant_webhook: {
        Args: {
          p_event_id: string;
          p_event_type: string;
          p_meeting_id: string;
          p_user_id: string;
          p_room_name: string;
          p_participant_sid: string;
          p_identity: string;
          p_display_name: string;
          p_region: string;
          p_joined_at: string;
          p_event_at: string;
          p_disconnect_reason: number;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

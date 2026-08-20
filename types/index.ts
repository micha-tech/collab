export type MeetingStatus = "active" | "ended";
export type MeetingRole = "host" | "participant";
export type Venue = "home" | "dashboard" | "meeting";

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  is_guest: boolean;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
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

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  user_id: string;
  display_name: string;
  role: MeetingRole;
  joined_at: string;
  left_at: string | null;
}

export interface MeetingMessage {
  id: string;
  meeting_id: string;
  sender_id: string;
  sender_name: string;
  body: string;
  created_at: string;
}

export interface MeetingTranscriptSegment {
  id: string;
  meeting_id: string;
  speaker_id: string;
  livekit_identity: string;
  speaker_name: string | null;
  text: string;
  started_at: string;
  ended_at: string;
  sequence: number;
  is_final: true;
  source: "local-asr";
  created_at: string;
}

export interface LiveKitTokenResponse {
  token: string;
  serverUrl: string;
  roomName: string;
  identity: string;
  role: MeetingRole;
}

export interface JoinMeetingResult {
  meeting: Pick<
    Meeting,
    "id" | "slug" | "title" | "status" | "allow_guests" | "host_id"
  >;
  participant: MeetingParticipant | null;
}

export interface CreateMeetingInput {
  title: string;
}

export interface ApiErrorBody {
  error: string;
  code?: "meeting_not_found" | "meeting_ended" | "unauthorized" | "forbidden";
}

export interface EndMeetingResult {
  ok: true;
  meeting: Pick<Meeting, "id" | "slug" | "status" | "ended_at">;
}

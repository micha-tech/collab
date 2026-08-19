export const LIVEKIT_ATTRIBUTE_KEYS = {
  userId: "userId",
  meetingId: "meetingId",
  role: "role",
} as const;

export interface ParticipantAttributesApp {
  userId?: string;
  meetingId?: string;
  role?: "host" | "participant";
}

export function parseParticipantAttributes(
  attributes: Record<string, string> | undefined,
): ParticipantAttributesApp {
  if (!attributes) return {};
  return {
    userId: attributes[LIVEKIT_ATTRIBUTE_KEYS.userId],
    meetingId: attributes[LIVEKIT_ATTRIBUTE_KEYS.meetingId],
    role:
      attributes[LIVEKIT_ATTRIBUTE_KEYS.role] === "host"
        ? "host"
        : attributes[LIVEKIT_ATTRIBUTE_KEYS.role] === "participant"
          ? "participant"
          : undefined,
  };
}
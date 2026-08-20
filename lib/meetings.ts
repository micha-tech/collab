import { createHash, randomBytes, randomUUID } from "node:crypto";
import { MEETING_ROOM_PREFIX } from "./constants";

export function generateMeetingSlug(): string {
  const tag = "v1";
  const entropy = randomBytes(9).toString("base64url");
  return `${tag}-${entropy}`;
}

export function generateLiveKitRoomName(): string {
  return `${MEETING_ROOM_PREFIX}${randomUUID()}`;
}

export function generateParticipantIdentity(userId: string): string {
  const nonce = randomBytes(5).toString("base64url");
  return `u_${userId.slice(0, 8)}_${nonce}`;
}

export function hashIpForLogs(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 12);
}

/**
 * Hosts always have access. Signed-in users may join an active meeting, while
 * anonymous sessions additionally require the host to allow guests.
 */
export function canJoinMeeting(input: {
  isHost: boolean;
  isAnonymous: boolean;
  allowGuests: boolean;
}): boolean {
  return input.isHost || !input.isAnonymous || input.allowGuests;
}

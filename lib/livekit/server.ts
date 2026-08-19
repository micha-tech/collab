import "server-only";

import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { getServerEnv } from "@/lib/config";
import { LIVEKIT_TOKEN_TTL_SECONDS } from "@/lib/constants";
import type { MeetingRole } from "@/types";

export interface IssueLiveKitTokenParams {
  roomName: string;
  identity: string;
  role: MeetingRole;
  displayName: string;
  userId: string;
  meetingId: string;
}

/**
 * Signs a LiveKit Access Token. Server-only; never import into the browser.
 */
export async function issueLiveKitToken(params: IssueLiveKitTokenParams) {
  const env = getServerEnv();

  const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity: params.identity,
    name: params.displayName,
    ttl: LIVEKIT_TOKEN_TTL_SECONDS,
    metadata: JSON.stringify({
      userId: params.userId,
      meetingId: params.meetingId,
      role: params.role,
    }),
    attributes: {
      userId: params.userId,
      meetingId: params.meetingId,
      role: params.role,
    },
  });

  at.addGrant({
    room: params.roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: false,
    roomCreate: false,
    roomList: false,
  });

  return await at.toJwt();
}

/**
 * Closes and deletes a LiveKit room, disconnecting anyone connected.
 * Ignores "room not found" since rooms are created lazily on first join.
 */
export async function closeLiveKitRoom(roomName: string) {
  const env = getServerEnv();
  const client = new RoomServiceClient(
    env.LIVEKIT_URL,
    env.LIVEKIT_API_KEY,
    env.LIVEKIT_API_SECRET,
  );

  try {
    await client.deleteRoom(roomName);
  } catch (error) {
    const isNotFound =
      error instanceof Error &&
      (error.message.includes("404") ||
        error.message.toLowerCase().includes("not found"));
    if (!isNotFound) {
      console.error(`Failed to close LiveKit room ${roomName}`, error);
    }
  }
}

export function livekitServerUrl(): string {
  const env = getServerEnv();
  return env.LIVEKIT_URL;
}
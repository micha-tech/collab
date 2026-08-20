"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LiveKitRoom } from "@livekit/components-react";
import {
  DisconnectReason,
  Room,
  type LocalAudioTrack,
  type LocalVideoTrack,
} from "livekit-client";
import type { RoomOptions } from "livekit-client";
import { PreJoin } from "@/components/meeting/prejoin";
import { MeetingRoom } from "@/components/meeting/meeting-room";
import { LeaveScreen } from "@/components/meeting/leave-screen";
import { ConnectionLostScreen } from "@/components/meeting/connection-lost-screen";
import { EndedScreen } from "@/components/meeting/ended-screen";
import {
  useLocalMedia,
  publishPrejoinTracks,
} from "@/components/meeting/use-local-media";
import { Spinner } from "@/components/ui/spinner";
import type { ApiErrorBody, MeetingStatus } from "@/types";

type Phase =
  | "lobby"
  | "joining"
  | "call"
  | "left"
  | "connection-lost"
  | "meeting-ended";

export interface MeetingGatewayProps {
  meeting: {
    id: string;
    slug: string;
    title: string;
    host_id: string;
    status: MeetingStatus;
    allow_guests: boolean;
  };
  initialUser: {
    id: string;
    is_anonymous: boolean;
    displayName?: string;
  } | null;
}

const ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
};

export function MeetingGateway({ meeting, initialUser }: MeetingGatewayProps) {
  const media = useLocalMedia();

  const [phase, setPhase] = useState<Phase>(
    meeting.status === "active" ? "lobby" : "meeting-ended",
  );
  const [displayName, setDisplayName] = useState(initialUser?.displayName ?? "");
  const [tokenInfo, setTokenInfo] = useState<{
    token: string;
    serverUrl: string;
  } | null>(null);
  const [identity, setIdentity] = useState("");
  const [connected, setConnected] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);
  const intentionalRef = useRef(false);
  const videoTrackRef = useRef<LocalVideoTrack | null>(null);
  const audioTrackRef = useRef<LocalAudioTrack | null>(null);
  const [room, setRoom] = useState<Room | null>(null);

  useEffect(() => {
    videoTrackRef.current = media.cameraTrack;
    audioTrackRef.current = media.audioTrack;
  }, [media.cameraTrack, media.audioTrack]);

  useEffect(() => {
    return () => {
      media.cleanUp();
      roomRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const freshRoom = useCallback((): Room => {
    roomRef.current?.disconnect();
    const next = new Room(ROOM_OPTIONS);
    roomRef.current = next;
    setRoom(next);
    return next;
  }, []);

  const join = useCallback(
    async (name: string) => {
      intentionalRef.current = true;
      setConnectError(null);
      setConnected(false);
      setPhase("joining");

      try {
        const joinRes = await fetch(`/api/meetings/${meeting.slug}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: meeting.slug, displayName: name }),
        });
        if (!joinRes.ok) {
          const err = (await joinRes.json().catch(() => null)) as
            | ApiErrorBody
            | null;
          if (joinRes.status === 410) {
            setPhase("meeting-ended");
            return;
          }
          throw new Error(err?.error ?? "Couldn't join the meeting.");
        }

        const tokenRes = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingSlug: meeting.slug, displayName: name }),
        });
        if (!tokenRes.ok) {
          const err = (await tokenRes.json().catch(() => null)) as
            | ApiErrorBody
            | null;
          if (tokenRes.status === 410) {
            setPhase("meeting-ended");
            return;
          }
          throw new Error(err?.error ?? "Couldn't start your connection.");
        }
        const data = (await tokenRes.json()) as {
          token: string;
          serverUrl: string;
          identity: string;
        };

        freshRoom();
        setDisplayName(name);
        setIdentity(data.identity);
        setTokenInfo({ token: data.token, serverUrl: data.serverUrl });
        setPhase("call");
      } catch (error) {
        intentionalRef.current = false;
        setConnectError(
          error instanceof Error ? error.message : "Something went wrong.",
        );
        setPhase("lobby");
      }
    },
    [meeting.slug, freshRoom],
  );

  const handleConnected = useCallback(
    (room: Room) => {
      // Joining may intentionally disconnect a stale Room instance. Once the
      // replacement connects, future disconnects must be treated as genuine.
      intentionalRef.current = false;
      setConnected(true);
      void publishPrejoinTracks(
        room,
        videoTrackRef.current,
        audioTrackRef.current,
      );
    },
    [],
  );

  const checkMeetingState = useCallback(async () => {
    try {
      const res = await fetch(`/api/meetings/${meeting.slug}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        meeting?: { status: MeetingStatus };
      };
      if (data.meeting?.status === "ended") {
        setPhase("meeting-ended");
      } else {
        setPhase("connection-lost");
      }
    } catch {
      setPhase("connection-lost");
    }
  }, [meeting.slug]);

  const handleDisconnected = useCallback(
    (reason?: DisconnectReason) => {
      setConnected(false);
      if (intentionalRef.current) return;
      if (reason !== DisconnectReason.CLIENT_INITIATED) {
        void checkMeetingState();
      }
    },
    [checkMeetingState, intentionalRef],
  );

  const handleError = useCallback(() => {
    setConnected(false);
    void checkMeetingState();
  }, [checkMeetingState]);

  const handleLeave = useCallback(() => {
    intentionalRef.current = true;
    media.cleanUp();
    roomRef.current?.disconnect();
    setTokenInfo(null);
    setPhase("left");
  }, [media]);

  const handleEndConfirm = useCallback(async () => {
    const res = await fetch(`/api/meetings/${meeting.slug}/end`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as ApiErrorBody | null;
      throw new Error(err?.error ?? "Couldn't end the meeting.");
    }
    // Meeting ended — disconnect locally immediately so we stop sending
    // media right away, even if the server-side room teardown is slow.
    intentionalRef.current = true;
    media.cleanUp();
    roomRef.current?.disconnect();
    setTokenInfo(null);
    setPhase("meeting-ended");
  }, [meeting.slug, media]);

  const handleRejoinFromLost = useCallback(() => {
    void join(displayName);
  }, [join, displayName]);

  if (phase === "meeting-ended") {
    return <EndedScreen title={meeting.title} />;
  }

  if (phase === "left") {
    return (
      <LeaveScreen
        meetingTitle={meeting.title}
        onRejoin={() => setPhase("lobby")}
      />
    );
  }

  if (phase === "connection-lost") {
    return <ConnectionLostScreen onRejoin={handleRejoinFromLost} />;
  }

  if (tokenInfo === null) {
    return (
      <div className="flex min-h-dvh w-full flex-col bg-room">
        <PreJoin
          meetingTitle={meeting.title}
          initialName={displayName}
          media={media}
          busy={phase === "joining"}
          onSubmit={({ name }) => void join(name)}
        />
        {connectError && (
          <p
            role="alert"
            className="mx-auto -mt-4 mb-6 max-w-md px-4 text-center text-sm text-danger"
          >
            {connectError}
          </p>
        )}
      </div>
    );
  }

  const isHost = meeting.host_id === initialUser?.id;

  return (
    <LiveKitRoom
      serverUrl={tokenInfo.serverUrl}
      token={tokenInfo.token}
      room={room ?? undefined}
      options={ROOM_OPTIONS}
      connect
      onConnected={() => {
        if (roomRef.current) handleConnected(roomRef.current);
      }}
      onDisconnected={handleDisconnected}
      onError={handleError}
      className="h-dvh w-full bg-room"
    >
      {connected ? (
        <MeetingRoom
          meeting={meeting}
          displayName={displayName}
          isHost={isHost}
          localIdentity={identity}
          onLeave={handleLeave}
          onEndConfirm={handleEndConfirm}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-room text-room-muted">
          <Spinner className="size-6" />
          <p className="text-sm">Connecting to the meeting…</p>
        </div>
      )}
    </LiveKitRoom>
  );
}

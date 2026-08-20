"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RoomEvent, type RemoteParticipant, type Room } from "livekit-client";

const TOPIC = "v-one.transcription-presence.v1";
const HEARTBEAT_MS = 8_000;
const EXPIRY_MS = 20_000;

interface PresenceMessage {
  version: 1;
  active: boolean;
  identity: string;
  name: string;
  sentAt: number;
}

interface ActiveTranscriber {
  identity: string;
  name: string;
  expiresAt: number;
}

export function parseTranscriptionPresence(payload: Uint8Array): PresenceMessage | null {
  try {
    const value = JSON.parse(new TextDecoder().decode(payload)) as Partial<PresenceMessage>;
    if (
      value.version !== 1 ||
      typeof value.active !== "boolean" ||
      typeof value.identity !== "string" ||
      typeof value.name !== "string" ||
      typeof value.sentAt !== "number"
    ) return null;
    return value as PresenceMessage;
  } catch {
    return null;
  }
}

export function useTranscriptionPresence(options: {
  room: Room;
  identity: string;
  displayName: string;
}) {
  const [activeByIdentity, setActiveByIdentity] = useState<Map<string, ActiveTranscriber>>(new Map());
  const localActiveRef = useRef(false);

  const publish = useCallback(async (active: boolean) => {
    if (options.room.state !== "connected") return;
    const message: PresenceMessage = {
      version: 1,
      active,
      identity: options.identity,
      name: options.displayName,
      sentAt: Date.now(),
    };
    await options.room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify(message)),
      { reliable: true, topic: TOPIC },
    );
  }, [options.displayName, options.identity, options.room]);

  const setLocalActive = useCallback((active: boolean) => {
    localActiveRef.current = active;
    setActiveByIdentity((current) => {
      const next = new Map(current);
      if (active) next.set(options.identity, {
        identity: options.identity,
        name: options.displayName,
        expiresAt: Date.now() + EXPIRY_MS,
      });
      else next.delete(options.identity);
      return next;
    });
    void publish(active);
  }, [options.displayName, options.identity, publish]);

  useEffect(() => {
    const onData = (
      payload: Uint8Array,
      participant?: RemoteParticipant,
      _kind?: unknown,
      topic?: string,
    ) => {
      if (topic !== TOPIC || !participant) return;
      const message = parseTranscriptionPresence(payload);
      // Trust the LiveKit sender identity, not the identity inside JSON.
      if (!message || message.identity !== participant.identity) return;
      setActiveByIdentity((current) => {
        const next = new Map(current);
        if (message.active) next.set(participant.identity, {
          identity: participant.identity,
          name: participant.name?.trim() || message.name || participant.identity,
          expiresAt: Date.now() + EXPIRY_MS,
        });
        else next.delete(participant.identity);
        return next;
      });
    };
    const onParticipantConnected = () => {
      if (localActiveRef.current) void publish(true);
    };
    const onParticipantDisconnected = (participant: RemoteParticipant) => {
      setActiveByIdentity((current) => {
        const next = new Map(current);
        next.delete(participant.identity);
        return next;
      });
    };
    options.room
      .on(RoomEvent.DataReceived, onData)
      .on(RoomEvent.ParticipantConnected, onParticipantConnected)
      .on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);

    const timer = window.setInterval(() => {
      if (localActiveRef.current) void publish(true);
      const now = Date.now();
      setActiveByIdentity((current) => {
        const next = new Map(current);
        let changed = false;
        for (const [identity, item] of next) {
          if (identity !== options.identity && item.expiresAt <= now) {
            next.delete(identity);
            changed = true;
          }
        }
        return changed ? next : current;
      });
    }, HEARTBEAT_MS);

    return () => {
      window.clearInterval(timer);
      if (localActiveRef.current) void publish(false);
      options.room
        .off(RoomEvent.DataReceived, onData)
        .off(RoomEvent.ParticipantConnected, onParticipantConnected)
        .off(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
    };
  }, [options.identity, options.room, publish]);

  const activeTranscribers = useMemo(() => [...activeByIdentity.values()], [activeByIdentity]);
  return {
    active: activeTranscribers.length > 0,
    activeTranscribers,
    localActive: activeByIdentity.has(options.identity),
    setLocalActive,
  };
}

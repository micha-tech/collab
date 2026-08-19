"use client";

import {
  isTrackReference,
  useIsMuted,
  useIsSpeaking,
  VideoTrack,
} from "@livekit/components-react";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-core";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LIVEKIT_ATTRIBUTE_KEYS } from "@/lib/livekit/types";

interface ParticipantTileProps {
  trackRef: TrackReferenceOrPlaceholder;
  isLocal?: boolean;
  showHostBadge?: boolean;
  hostName?: string;
}

function displayNameFor(participant: {
  name?: string;
  identity: string;
}): string {
  return participant.name?.trim() ? participant.name : participant.identity;
}

export function ParticipantTile({
  trackRef,
  isLocal = false,
  showHostBadge = false,
  hostName,
}: ParticipantTileProps) {
  const participant = trackRef.participant;
  const isSpeaking = useIsSpeaking(participant);
  const hasVideo = isTrackReference(trackRef) && trackRef.publication.isSubscribed;
  const isMuted = useIsMuted(trackRef);
  const name = displayNameFor(participant);
  const attributes = participant.attributes;
  const appRole = attributes?.[LIVEKIT_ATTRIBUTE_KEYS.role];
  const isHost =
    appRole === "host" ||
    Boolean(showHostBadge && name === hostName);

  return (
    <div
      className={cn(
        "group relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border bg-room-surface transition-[border-color,box-shadow] duration-200",
        isSpeaking
          ? "border-accent/80 shadow-[0_0_0_1px_var(--accent),0_0_20px_-2px_color-mix(in_srgb,var(--accent)_45%,transparent)]"
          : "border-room-border",
      )}
    >
      {hasVideo ? (
        <VideoTrack
          trackRef={trackRef}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-b from-room-surface to-black/60">
          <span className="flex size-20 flex-col items-center justify-center">
            <Avatar name={name} className="size-20 text-2xl" />
          </span>
          <span className="px-3 text-center text-sm font-medium text-room-fg">
            {name}
          </span>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8">
        <span className="flex items-center gap-2">
          <span className="max-w-[70%] truncate rounded-md bg-black/45 px-2 py-0.5 text-sm font-medium text-room-fg backdrop-blur-sm">
            {name}
            {isLocal ? " (You)" : ""}
          </span>
          {isHost && (
            <Badge
              className="rounded-md bg-accent/85 px-1.5 py-0 text-[11px] font-medium text-white"
            >
              Host
            </Badge>
          )}
        </span>
        {isMuted && (
          <span
            className="flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-xs text-room-muted backdrop-blur-sm"
            aria-label="Microphone muted"
            title="Microphone muted"
          >
            <MicOff className="size-3.5" />
            <span className="sr-only">Muted</span>
          </span>
        )}
        {isSpeaking && !isMuted && (
          <span
            className="flex items-center gap-1 rounded-full bg-accent/85 px-2 py-0.5 text-xs text-white"
            aria-label="Speaking"
            title="Speaking"
          >
            <Volume2 className="size-3.5" />
            <Mic className="size-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}
"use client";

import { useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-core";
import { cn } from "@/lib/utils";
import { ParticipantTile } from "@/components/meeting/participant-tile";
import { AIParticipantTile } from "@/components/transcription/ai-participant-tile";

function orderTracks(
  tracks: TrackReferenceOrPlaceholder[],
  localIdentity?: string,
): TrackReferenceOrPlaceholder[] {
  return [...tracks].sort((a, b) => {
    const aLocal = a.participant.identity === localIdentity ? 1 : 0;
    const bLocal = b.participant.identity === localIdentity ? 1 : 0;
    return aLocal - bLocal;
  });
}

function gridClass(count: number): string {
  if (count <= 1) {
    return "grid-cols-1 md:max-w-4xl";
  }
  if (count === 2) {
    return "grid-cols-1 sm:grid-cols-2";
  }
  if (count <= 4) {
    return "grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-2";
  }
  if (count <= 6) {
    return "grid-cols-1 xs:grid-cols-2 sm:grid-cols-3";
  }
  if (count <= 9) {
    return "grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-3";
  }
  return "grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
}

export function VideoGrid({
  localIdentity,
  compact = false,
  transcriptionActive = false,
}: {
  localIdentity?: string;
  compact?: boolean;
  transcriptionActive?: boolean;
}) {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const ordered = orderTracks(tracks, localIdentity);
  const count = ordered.length + (transcriptionActive ? 1 : 0);

  if (count === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-room-subtle">
        Waiting for participants…
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid h-full w-full auto-rows-fr gap-3 overflow-y-auto p-3 sm:gap-4 sm:p-4",
        gridClass(count),
        compact && "gap-2 p-2 sm:gap-2 sm:p-2",
      )}
    >
      {ordered.map((trackRef) => (
        <div
          key={trackRef.participant.identity}
          className="min-h-0 min-w-0"
        >
          <ParticipantTile
            trackRef={trackRef}
            isLocal={trackRef.participant.identity === localIdentity}
          />
        </div>
      ))}
      {transcriptionActive && (
        <div className="min-h-0 min-w-0">
          <AIParticipantTile />
        </div>
      )}
    </div>
  );
}

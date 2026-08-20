"use client";

import { VideoTrack, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import type { TrackReference } from "@livekit/components-core";
import { Avatar } from "@/components/ui/avatar";
import { AIParticipantTile } from "@/components/transcription/ai-participant-tile";

export function ScreenShareLayout({
  localIdentity,
  onStopSharing,
  transcriptionActive = false,
}: {
  localIdentity?: string;
  onStopSharing?: () => void;
  transcriptionActive?: boolean;
}) {
  const screenTracks = useTracks([Track.Source.ScreenShare]);
  const cameraTracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
  ]);

  const active: TrackReference | null =
    screenTracks.find((t) => t.publication?.isSubscribed) ??
    screenTracks[0] ??
    null;

  const isLocalShare = active?.participant.identity === localIdentity;
  const sharingName = isLocalShare
    ? "You"
    : active?.participant.name?.trim() ||
      active?.participant.identity ||
      "Someone";

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-md bg-black">
        {active ? (
          <VideoTrack
            trackRef={active}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-room-subtle">
            Preparing presentation…
          </div>
        )}

        <div className="pointer-events-none absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-black/60 px-3 py-1.5 text-sm text-room-fg backdrop-blur-sm">
          {sharingName} is presenting
        </div>

        {isLocalShare && onStopSharing && (
          <button
            type="button"
            onClick={onStopSharing}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-room-fg px-4 py-2 text-sm font-medium text-foreground shadow-lg transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Stop sharing
          </button>
        )}
      </div>

      {(cameraTracks.length > 1 || transcriptionActive) && (
        <div className="mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {cameraTracks.map((t) => (
            <div
              key={t.participant.identity}
              className="relative h-20 w-32 shrink-0 overflow-hidden rounded-md bg-room-surface"
            >
              {t.publication ? (
                <VideoTrack
                  trackRef={t as TrackReference}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Avatar
                    name={t.participant.name || t.participant.identity}
                    className="size-10"
                  />
                </div>
              )}
              <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/55 px-1.5 py-0.5 text-[11px] text-room-fg">
                {t.participant.name || t.participant.identity}
              </span>
            </div>
          ))}
          {transcriptionActive && (
            <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-md bg-room-surface">
              <AIParticipantTile compact />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

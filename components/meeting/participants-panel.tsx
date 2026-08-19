"use client";

import { useParticipants, useLocalParticipant } from "@livekit/components-react";
import { Mic, MicOff, Users, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ParticipantsPanelProps {
  open: boolean;
  onClose: () => void;
  localIdentity?: string;
}

export function ParticipantsPanel({
  open,
  onClose,
  localIdentity,
}: ParticipantsPanelProps) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const localMicOn = localParticipant.isMicrophoneEnabled;

  return (
    <aside
      aria-label="Participants"
      className={cn(
        "absolute inset-y-0 right-0 z-20 flex w-full flex-col border-l border-room-border bg-room-surface transition-transform duration-200 sm:w-[320px]",
        open ? "translate-x-0" : "translate-x-full",
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-room-border px-4">
        <h2 className="flex items-center gap-2 text-sm font-medium text-room-fg">
          <Users className="size-4 text-room-muted" />
          Participants ({participants.length})
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close participants"
          className="rounded-md p-1.5 text-room-muted transition-colors hover:bg-room-surface-elevated hover:text-room-fg"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="meeting-scroll flex-1 overflow-y-auto p-2">
        {participants.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-room-subtle">
            No participants yet.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {participants.map((p) => {
              const isLocal = p.identity === localIdentity;
              const isHost = p.attributes?.role === "host";
              const muted = isLocal
                ? !localMicOn
                : p.isMicrophoneEnabled === false;
              const name = p.name?.trim() || p.identity || "Anonymous";
              return (
                <li
                  key={p.identity}
                  className="flex items-center gap-3 rounded-lg px-2 py-2"
                >
                  <Avatar name={name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-room-fg">
                      {name}
                      {isLocal ? " (You)" : ""}
                    </p>
                    {isHost && (
                      <span className="text-xs text-accent">Host</span>
                    )}
                  </div>
                  {muted ? (
                    <MicOff
                      className="size-4 shrink-0 text-danger"
                      aria-label="Microphone muted"
                    />
                  ) : (
                    <Mic
                      className="size-4 shrink-0 text-room-subtle"
                      aria-label="Microphone on"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
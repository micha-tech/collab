"use client";

import { useEffect, useState } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { MonitorUp, MonitorOff, Camera, CameraOff, Mic, MicOff, MessageSquare, Users, PhoneOff, Square, NotepadText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MeetingControlsProps {
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onToggleNotes: () => void;
  onLeave: () => void;
  onEnd: () => void;
  isHost: boolean;
  sharing: boolean;
  chatUnread: boolean;
  chatOpen: boolean;
  participantsOpen: boolean;
  notesOpen: boolean;
}

interface ControlButtonProps {
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}

function ControlButton({
  label,
  onClick,
  active,
  danger,
  children,
}: ControlButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          className={cn(
            "flex size-12 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
            danger
              ? "border-danger bg-danger text-white hover:bg-danger-strong"
              : active
                ? "border-room-border bg-room-surface-elevated text-room-fg hover:bg-room-border"
                : "border-room-border bg-room-surface text-room-muted hover:bg-room-surface-elevated hover:text-room-fg",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function MeetingControls({
  onToggleChat,
  onToggleParticipants,
  onToggleNotes,
  onLeave,
  onEnd,
  isHost,
  sharing,
  chatUnread,
  chatOpen,
  participantsOpen,
  notesOpen,
}: MeetingControlsProps) {
  const { localParticipant } = useLocalParticipant();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [togglingMic, setTogglingMic] = useState(false);
  const [togglingCam, setTogglingCam] = useState(false);
  const [togglingShare, setTogglingShare] = useState(false);

  // LiveKit track muted state drives the icons.
  useEffect(() => {
    const updateMuted = () => {
      setMicOn(localParticipant.isMicrophoneEnabled);
      setCamOn(localParticipant.isCameraEnabled);
    };
    updateMuted();
    localParticipant
      .on("trackMuted", updateMuted)
      .on("trackUnmuted", updateMuted);
    return () => {
      localParticipant
        .off("trackMuted", updateMuted)
        .off("trackUnmuted", updateMuted);
    };
  }, [localParticipant]);

  const toggleMic = async () => {
    setTogglingMic(true);
    try {
      await localParticipant.setMicrophoneEnabled(!micOn);
    } catch {
      // Browser rejected the request or the track failed; state stays in sync
      // via trackMuted/trackUnmuted events.
    } finally {
      setTogglingMic(false);
    }
  };

  const toggleCam = async () => {
    setTogglingCam(true);
    try {
      await localParticipant.setCameraEnabled(!camOn);
    } catch {
      // Browser rejected the request or the track failed.
    } finally {
      setTogglingCam(false);
    }
  };

  const toggleShare = async () => {
    setTogglingShare(true);
    try {
      if (sharing) {
        await localParticipant.setScreenShareEnabled(false);
      } else {
        await localParticipant.setScreenShareEnabled(true);
      }
    } catch {
      // The user cancelled the picker or the browser rejected the request.
    } finally {
      setTogglingShare(false);
    }
  };

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto flex items-center gap-3">
        <ControlButton
          label={micOn ? "Mute microphone" : "Unmute microphone"}
          onClick={() => void toggleMic()}
          active={micOn}
        >
          {togglingMic ? (
            <Spinner className="size-5" />
          ) : micOn ? (
            <Mic className="size-5" />
          ) : (
            <MicOff className="size-5 text-danger" />
          )}
        </ControlButton>

        <ControlButton
          label={camOn ? "Turn camera off" : "Turn camera on"}
          onClick={() => void toggleCam()}
          active={camOn}
        >
          {togglingCam ? (
            <Spinner className="size-5" />
          ) : camOn ? (
            <Camera className="size-5" />
          ) : (
            <CameraOff className="size-5 text-danger" />
          )}
        </ControlButton>

        <ControlButton
          label={sharing ? "Stop sharing" : "Share screen"}
          onClick={() => void toggleShare()}
          active={sharing}
        >
          {togglingShare ? (
            <Spinner className="size-5" />
          ) : sharing ? (
            <MonitorOff className="size-5 text-danger" />
          ) : (
            <MonitorUp className="size-5" />
          )}
        </ControlButton>

        <ControlButton
          label="Chat"
          onClick={onToggleChat}
          active={chatOpen}
        >
          <span className="relative">
            <MessageSquare className="size-5" />
            {chatUnread && !chatOpen && (
              <span className="absolute -right-1 -top-1 size-2 rounded-full bg-accent" />
            )}
          </span>
        </ControlButton>

        <ControlButton
          label="Participants"
          onClick={onToggleParticipants}
          active={participantsOpen}
        >
          <Users className="size-5" />
        </ControlButton>

        <ControlButton
          label="Notes"
          onClick={onToggleNotes}
          active={notesOpen}
        >
          <NotepadText className="size-5" />
        </ControlButton>

        <ControlButton label="Leave" onClick={onLeave} danger>
          <PhoneOff className="size-5" />
        </ControlButton>
      </div>

      {isHost && (
        <button
          type="button"
          onClick={onEnd}
          className="pointer-events-auto mt-3 flex h-11 items-center gap-2 rounded-full border border-danger/70 bg-danger/90 px-5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-danger-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/60"
        >
          <Square className="size-4 fill-current" aria-hidden />
          End meeting
        </button>
      )}
    </div>
  );
}
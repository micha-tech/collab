"use client";

import { useEffect, useState } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { MonitorUp, MonitorOff, Camera, CameraOff, Mic, MicOff, MessageSquare, Users, PhoneOff, Square, NotepadText, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

function ControlButton({
  label,
  onClick,
  active,
  danger,
  disabled,
  className,
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
          disabled={disabled}
          className={cn(
            "flex size-11 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 disabled:cursor-wait disabled:opacity-60 sm:size-12",
            danger
              ? "border-danger bg-danger text-white hover:bg-danger-strong"
              : active
                ? "border-room-border bg-room-surface-elevated text-room-fg hover:bg-room-border"
                : "border-room-border bg-room-surface text-room-muted hover:bg-room-surface-elevated hover:text-room-fg",
            className,
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
      toast.error("Microphone unavailable", {
        description: "Check your browser permission and selected microphone.",
      });
    } finally {
      setTogglingMic(false);
    }
  };

  const toggleCam = async () => {
    setTogglingCam(true);
    try {
      await localParticipant.setCameraEnabled(!camOn);
    } catch {
      toast.error("Camera unavailable", {
        description: "Check your browser permission and selected camera.",
      });
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
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        toast.error("Screen sharing couldn't start", {
          description: "Your browser may have blocked screen sharing.",
        });
      }
    } finally {
      setTogglingShare(false);
    }
  };

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div
        role="toolbar"
        aria-label="Meeting controls"
        className="pointer-events-auto flex items-center gap-2 rounded-full border border-room-border/80 bg-room/80 p-1.5 shadow-xl backdrop-blur-md sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none"
      >
        <ControlButton
          label={micOn ? "Mute microphone" : "Unmute microphone"}
          onClick={() => void toggleMic()}
          active={micOn}
          disabled={togglingMic}
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
          disabled={togglingCam}
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
          disabled={togglingShare}
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
          label={chatUnread && !chatOpen ? "Chat, new message" : "Chat"}
          onClick={onToggleChat}
          active={chatOpen}
          className="hidden min-[480px]:flex"
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
          className="hidden min-[480px]:flex"
        >
          <Users className="size-5" />
        </ControlButton>

        <ControlButton
          label="Notes"
          onClick={onToggleNotes}
          active={notesOpen}
          className="hidden min-[480px]:flex"
        >
          <NotepadText className="size-5" />
        </ControlButton>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={
                chatUnread && !chatOpen
                  ? "More meeting controls, new chat message"
                  : "More meeting controls"
              }
              className="flex size-11 items-center justify-center rounded-full border border-room-border bg-room-surface text-room-muted transition-colors hover:bg-room-surface-elevated hover:text-room-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 min-[480px]:hidden"
            >
              <span className="relative">
                <MoreHorizontal className="size-5" />
                {chatUnread && !chatOpen && (
                  <span className="absolute -right-1 -top-1 size-2 rounded-full bg-accent" />
                )}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="end"
            className="w-52 border-room-border bg-room-surface text-room-fg"
          >
            <DropdownMenuItem onSelect={onToggleChat} className="focus:bg-room-surface-elevated">
              <MessageSquare /> Chat {chatUnread && !chatOpen ? "· New" : ""}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onToggleParticipants} className="focus:bg-room-surface-elevated">
              <Users /> Participants
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onToggleNotes} className="focus:bg-room-surface-elevated">
              <NotepadText /> Notes
            </DropdownMenuItem>
            {isHost && (
              <>
                <DropdownMenuSeparator className="bg-room-border" />
                <DropdownMenuItem onSelect={onEnd} className="text-red-300 focus:bg-danger/15">
                  <Square /> End for everyone
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <ControlButton label="Leave" onClick={onLeave} danger>
          <PhoneOff className="size-5" />
        </ControlButton>
      </div>

      {isHost && (
        <button
          type="button"
          onClick={onEnd}
          className="pointer-events-auto mt-2 hidden h-10 items-center gap-2 rounded-full border border-danger/70 bg-danger/90 px-4 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-danger-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/60 min-[480px]:flex"
        >
          <Square className="size-4 fill-current" aria-hidden />
          End meeting
        </button>
      )}
    </div>
  );
}

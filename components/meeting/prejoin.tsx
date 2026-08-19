"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Mic, MicOff, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { UseLocalMedia } from "@/components/meeting/use-local-media";

interface PreJoinProps {
  meetingTitle: string;
  initialName?: string;
  media: UseLocalMedia;
  busy: boolean;
  onSubmit: (input: { name: string }) => void;
}

export function PreJoin({
  meetingTitle,
  initialName = "",
  media,
  busy,
  onSubmit,
}: PreJoinProps) {
  const [name, setName] = useState(initialName);
  const [nameError, setNameError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const cameraPreviewing = media.cameraEnabled && media.cameraTrack;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (media.cameraTrack) {
      media.cameraTrack.attach(video);
      return () => {
        media.cameraTrack?.detach(video);
      };
    }
  }, [media.cameraTrack]);

  const cannotStartCamera =
    media.cameraIssue === "permission-denied" ||
    media.cameraIssue === "not-found" ||
    media.cameraIssue === "in-use";
  const cannotStartMic =
    media.micIssue === "permission-denied" ||
    media.micIssue === "not-found";

  const handleSubmit = () => {
    if (!name.trim()) {
      setNameError("Please enter your name to join.");
      return;
    }
    setNameError(null);
    onSubmit({ name: name.trim() });
  };

  return (
    <div className="flex min-h-dvh w-full items-center justify-center overflow-y-auto bg-room px-4 py-8 sm:px-6">
      <div className="w-full max-w-2xl">
        <div className="mb-5 text-center">
          <h1 className="text-lg font-semibold text-room-fg">{meetingTitle}</h1>
          <p className="mt-1 text-sm text-room-muted">
            Check your camera and microphone before joining.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-room-border bg-room-surface shadow-xl">
          {/* Preview */}
          <div className="relative aspect-video w-full bg-black/40">
            {cameraPreviewing ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                <Avatar
                  name={name.trim() || "You"}
                  size="lg"
                  className="size-24 text-3xl"
                />
                <div className="text-sm font-medium text-room-muted">
                  {name.trim() || "You"}
                </div>
              </div>
            )}

            {cameraPreviewing && (
              <div className="absolute bottom-3 left-3 rounded-md bg-black/55 px-2.5 py-1 text-sm font-medium text-room-fg backdrop-blur-sm">
                {name.trim() || "You"}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => void media.toggleMic()}
                    aria-label={media.micEnabled ? "Turn microphone off" : "Turn microphone on"}
                    aria-pressed={media.micEnabled}
                    className={cn(
                      "flex size-14 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                      media.micEnabled
                        ? "border-room-border bg-room-surface-elevated text-room-fg hover:bg-room-border"
                        : "border-danger/70 bg-danger text-white",
                    )}
                  >
                    {media.micEnabled ? (
                      <Mic className="size-6" />
                    ) : (
                      <MicOff className="size-6" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {media.micEnabled ? "Mute microphone" : "Unmute microphone"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => void media.toggleCamera()}
                    aria-label={
                      media.cameraEnabled
                        ? "Turn camera off"
                        : "Turn camera on"
                    }
                    aria-pressed={media.cameraEnabled}
                    className={cn(
                      "flex size-14 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                      media.cameraEnabled
                        ? "border-room-border bg-room-surface-elevated text-room-fg hover:bg-room-border"
                        : "border-danger/70 bg-danger text-white",
                    )}
                  >
                    {media.cameraEnabled ? (
                      <Camera className="size-6" />
                    ) : (
                      <CameraOff className="size-6" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {media.cameraEnabled ? "Turn camera off" : "Turn camera on"}
                </TooltipContent>
              </Tooltip>
            </div>

            {(cannotStartCamera || cannotStartMic) && (
              <div
                role="alert"
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-sm text-amber-200"
              >
                {cannotStartCamera && cannotStartMic
                  ? "Camera and microphone access are blocked. You can still join and listen."
                  : cannotStartCamera
                    ? "Camera is off. You can still join with audio."
                    : "Microphone access is blocked. You can still join and listen."}
                {media.cameraIssue === "not-found" && (
                  <span className="block text-xs text-amber-200/70">
                    No camera was found on this device.
                  </span>
                )}
                {media.micIssue === "not-found" && (
                  <span className="block text-xs text-amber-200/70">
                    No microphone was found on this device.
                  </span>
                )}
              </div>
            )}

            {/* Device selection */}
            {(media.cameraDevices.length > 1 ||
              media.micDevices.length > 1) && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {media.micDevices.length > 1 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-room-muted">
                      Microphone
                    </Label>
                    <Select
                      value={media.microphoneDeviceId ?? undefined}
                      onValueChange={(v) => void media.setMicDevice(v)}
                    >
                      <SelectTrigger className="dark bg-room-surface-elevated text-room-fg">
                        <SelectValue placeholder="Default microphone" />
                      </SelectTrigger>
                      <SelectContent className="dark">
                        {media.micDevices.map((device) => (
                          <SelectItem
                            key={device.deviceId}
                            value={device.deviceId}
                          >
                            {device.label || "Microphone"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {media.cameraDevices.length > 1 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-room-muted">Camera</Label>
                    <Select
                      value={media.cameraDeviceId ?? undefined}
                      onValueChange={(v) => void media.setCameraDevice(v)}
                    >
                      <SelectTrigger className="dark bg-room-surface-elevated text-room-fg">
                        <SelectValue placeholder="Default camera" />
                      </SelectTrigger>
                      <SelectContent className="dark">
                        {media.cameraDevices.map((device) => (
                          <SelectItem
                            key={device.deviceId}
                            value={device.deviceId}
                          >
                            {device.label || "Camera"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <Label
                htmlFor="join-name"
                className="text-sm text-room-fg"
              >
                Your name
              </Label>
              <Input
                id="join-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError(null);
                }}
                placeholder="Enter your name"
                maxLength={80}
                autoComplete="name"
                aria-invalid={Boolean(nameError)}
                className="dark h-12 bg-room-surface-elevated text-room-fg placeholder:text-room-subtle"
              />
              {nameError && (
                <p role="alert" className="text-xs text-danger">
                  {nameError}
                </p>
              )}
            </div>

            <Button
              size="lg"
              className="h-12 w-full text-base"
              disabled={busy}
              onClick={handleSubmit}
            >
              {busy ? <Spinner /> : <Video className="size-5" />}
              {busy ? "Joining…" : "Join meeting"}
            </Button>

            <p className="text-center text-xs text-room-subtle">
              Join over a secure connection. No account needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
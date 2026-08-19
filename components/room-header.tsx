"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useConnectionState } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { Check, Copy } from "lucide-react";
import { meetingUrl } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function RoomHeader({
  meetingSlug,
  title,
  participantCount,
}: {
  meetingSlug: string;
  title: string;
  participantCount: number;
}) {
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const connectionState = useConnectionState();

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const copyLink = async () => {
    const url = meetingUrl(meetingSlug);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const seconds = elapsed;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const duration = h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  const reconnecting = connectionState === ConnectionState.Reconnecting;

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-3 border-b border-room-border px-3 sm:px-4">
      <Link
        href="/"
        aria-label="Back to V-One Collab home"
        className="shrink-0 rounded-md px-1 py-0.5 text-sm font-semibold tracking-tight text-room-fg transition-colors hover:text-room-muted"
      >
        V-One Collab
      </Link>

      <div className="min-w-0 flex-1">
        <h1
          className="truncate text-sm font-medium text-room-fg sm:text-base"
          title={title}
        >
          {title}
        </h1>
        <div className="flex items-center gap-2 text-xs text-room-subtle">
          <span aria-label={`Meeting duration ${duration}`}>• {duration}</span>
          <span className="hidden sm:inline">
            • {participantCount} {participantCount === 1 ? "participant" : "participants"}
          </span>
          {reconnecting && (
            <span className="text-amber-400" role="status">
              • Reconnecting…
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => void copyLink()}
              aria-label={copied ? "Link copied" : "Copy meeting link"}
              className="flex items-center gap-1.5 rounded-lg border border-room-border bg-room-surface px-2.5 py-1.5 text-sm text-room-muted transition-colors hover:bg-room-surface-elevated hover:text-room-fg"
            >
              {copied ? (
                <Check className="size-4 text-accent" />
              ) : (
                <Copy className="size-4" />
              )}
              <span className="hidden md:inline">{copied ? "Copied" : "Copy link"}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>Copy meeting link</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
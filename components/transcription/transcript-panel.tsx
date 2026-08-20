"use client";

import { useEffect, useRef } from "react";
import { Captions, Loader2, X } from "lucide-react";
import type { LocalParticipant } from "livekit-client";
import { cn } from "@/lib/utils";
import { useLocalTranscription } from "@/hooks/use-local-transcription";
import { useTranscriptSegments } from "@/hooks/use-transcript-segments";
import { TranscriptSegmentView } from "./transcript-segment";

interface TranscriptPanelProps {
  open: boolean;
  meetingId: string;
  livekitIdentity: string;
  localParticipant: LocalParticipant;
  onClose: () => void;
  onActiveChange: (active: boolean) => void;
}

export function TranscriptPanel({ open, meetingId, livekitIdentity, localParticipant, onClose, onActiveChange }: TranscriptPanelProps) {
  const transcript = useLocalTranscription({ meetingId, livekitIdentity, localParticipant, onActiveChange });
  const { segments, loading } = useTranscriptSegments(meetingId);
  const listRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  useEffect(() => {
    if (open && atBottomRef.current) listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [open, segments.length]);

  const active = !["disabled", "error"].includes(transcript.state);
  const busy = ["initializing", "loading-model", "ready"].includes(transcript.state);

  return (
    <aside aria-label="Live transcript" aria-hidden={!open} inert={!open}
      className={cn("absolute inset-y-0 right-0 z-20 flex w-full flex-col border-l border-room-border bg-room-surface transition-transform duration-200 sm:w-[400px]", open ? "translate-x-0" : "translate-x-full")}>
      <header className="flex min-h-14 items-center justify-between border-b border-room-border px-4">
        <h2 className="flex items-center gap-2 text-sm font-medium"><Captions className="size-4" /> Live Transcript</h2>
        <button type="button" onClick={onClose} aria-label="Close transcript" className="rounded-md p-1.5 text-room-muted hover:bg-room-surface-elevated"><X className="size-4" /></button>
      </header>

      <section className="border-b border-room-border bg-room/30 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium text-room-fg">
              <span className={cn("size-2 rounded-full", active ? "bg-red-500" : "bg-room-subtle")} />
              {active ? "Live transcription enabled" : "Local transcription off"}
            </p>
            <p className="mt-1 text-[11px] text-room-subtle">AI speech recognition runs on this device. Final transcript text is stored in the meeting workspace.</p>
          </div>
          <button type="button" disabled={busy || transcript.capability === "unsupported"}
            onClick={() => active ? transcript.disable() : void transcript.enable()}
            className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
            {busy ? <Loader2 className="size-4 animate-spin" /> : active ? "Stop" : "Start"}
          </button>
        </div>
        {busy && <div className="mt-2 text-[11px] text-room-muted">{transcript.status ?? "Preparing transcription…"}{transcript.progress > 0 ? ` ${transcript.progress}%` : ""}</div>}
        {transcript.error && <div role="alert" className="mt-2 text-xs text-danger">Transcription unavailable: {transcript.error} Your meeting will continue normally.</div>}
      </section>

      <div ref={listRef} onScroll={(event) => {
        const node = event.currentTarget;
        atBottomRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
      }} className="meeting-scroll flex-1 overflow-y-auto">
        {loading ? <p className="p-4 text-sm text-room-muted">Loading transcript…</p>
          : segments.length === 0 ? <div className="flex h-full flex-col items-center justify-center px-8 text-center"><Captions className="mb-3 size-8 text-room-subtle" /><p className="text-sm text-room-muted">No transcript yet</p><p className="mt-1 text-xs text-room-subtle">Start local transcription to turn your speech into speaker-attributed text.</p></div>
          : segments.map((segment) => <TranscriptSegmentView key={segment.id} segment={segment} />)}
      </div>
    </aside>
  );
}

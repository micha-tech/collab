"use client";

import { NotepadText, X } from "lucide-react";
import { useSharedNotes } from "@/lib/collab/use-shared-notes";
import { cn } from "@/lib/utils";

interface CollaborationPanelProps {
  open: boolean;
  meetingId: string;
  displayName: string;
  onClose: () => void;
}

export function CollaborationPanel({
  open,
  meetingId,
  displayName,
  onClose,
}: CollaborationPanelProps) {
  const { value, setValue, editors, connected } = useSharedNotes(
    meetingId,
    displayName,
  );

  return (
    <aside
      aria-label="Shared meeting notes"
      aria-hidden={!open}
      inert={!open}
      className={cn(
        "absolute inset-y-0 right-0 z-20 flex w-full flex-col border-l border-room-border bg-room-surface transition-transform duration-200 sm:w-[360px]",
        open ? "translate-x-0" : "translate-x-full",
      )}
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-room-border px-4">
        <h2 className="flex items-center gap-2 text-sm font-medium text-room-fg">
          <NotepadText className="size-4 text-room-muted" />
          Notes
        </h2>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-[11px]",
              connected ? "text-room-muted" : "text-amber-400",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                connected ? "bg-accent" : "bg-amber-400",
              )}
            />
            {connected ? "Synced" : "Connecting…"}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notes"
            className="rounded-md p-1.5 text-room-muted transition-colors hover:bg-room-surface-elevated hover:text-room-fg"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {editors.length > 1 ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-room-border px-4 py-2">
          {editors.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-room-surface-elevated px-2 py-0.5 text-[11px] text-room-muted"
            >
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: "var(--accent)" }}
              />
              {name}
            </span>
          ))}
          <span className="ml-1 text-[11px] text-room-subtle">
            editing now
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 border-b border-room-border px-4 py-2 text-[11px] text-room-subtle">
          Edits sync live to everyone in the meeting.
        </div>
      )}

      <div className="meeting-scroll flex flex-1 flex-col overflow-y-auto">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Write shared notes here — they sync live as you type…"
          aria-label="Shared meeting notes"
          spellCheck
          className="min-h-0 flex-1 resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-room-fg placeholder:text-room-subtle focus:outline-none"
        />
      </div>

      <div className="flex items-center justify-between border-t border-room-border px-4 py-2 text-[10px] text-room-subtle">
        <span>Yjs · synced over Supabase Realtime</span>
        <span>{editors.length} editor{editors.length === 1 ? "" : "s"}</span>
      </div>
    </aside>
  );
}

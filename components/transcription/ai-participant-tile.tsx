import { Bot, Captions, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function AIParticipantTile({ compact = false }: { compact?: boolean }) {
  return (
    <div
      role="status"
      aria-label="V-One AI transcription assistant is in the meeting"
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-violet-400/50 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.24),_rgba(9,9,15,0.96)_65%)] shadow-[0_0_24px_-8px_rgba(139,92,246,0.7)]",
        compact && "rounded-md",
      )}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className={cn("relative flex size-20 items-center justify-center rounded-2xl border border-violet-300/30 bg-violet-500/15", compact && "size-10 rounded-xl")}>
          <Bot className={cn("size-10 text-violet-200", compact && "size-5")} />
          <Sparkles className="absolute -right-2 -top-2 size-5 text-violet-300" />
        </div>
        {!compact && (
          <div>
            <p className="text-sm font-semibold text-white">V-One AI</p>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-violet-200">
              <span className="size-2 animate-pulse rounded-full bg-red-500" />
              Local transcription active
            </p>
          </div>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent px-3 pb-2.5 pt-8">
        <span className="rounded-md bg-black/45 px-2 py-0.5 text-sm font-medium text-white">V-One AI</span>
        <span className="flex items-center gap-1 rounded-full bg-violet-500/80 px-2 py-0.5 text-xs text-white"><Captions className="size-3.5" /> AI</span>
      </div>
    </div>
  );
}

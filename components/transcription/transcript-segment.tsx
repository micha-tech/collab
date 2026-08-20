import type { MeetingTranscriptSegment } from "@/types";

export function TranscriptSegmentView({ segment }: { segment: MeetingTranscriptSegment }) {
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(new Date(segment.started_at));
  return (
    <article className="border-b border-room-border/70 px-4 py-3 last:border-b-0">
      <div className="mb-1 flex items-center gap-2 text-xs">
        <time className="font-mono text-room-subtle" dateTime={segment.started_at}>{time}</time>
        <span className="font-medium text-room-fg">{segment.speaker_name ?? "Participant"}</span>
      </div>
      <p className="text-sm leading-relaxed text-room-fg">{segment.text}</p>
    </article>
  );
}

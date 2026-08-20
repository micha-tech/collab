"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MeetingTranscriptSegment } from "@/types";

export function useTranscriptSegments(meetingId: string) {
  const [segments, setSegments] = useState<MeetingTranscriptSegment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    void fetch(`/api/transcript?meetingId=${encodeURIComponent(meetingId)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((body: { segments: MeetingTranscriptSegment[] }) => { if (active) setSegments(body.segments); })
      .finally(() => { if (active) setLoading(false); });

    const channel = supabase
      .channel(`transcript-${meetingId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "meeting_transcript_segments", filter: `meeting_id=eq.${meetingId}`,
      }, (payload) => {
        const next = payload.new as MeetingTranscriptSegment;
        setSegments((current) => current.some((item) => item.id === next.id)
          ? current
          : [...current, next].sort((a, b) => a.sequence - b.sequence).slice(-500));
      })
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [meetingId]);

  return { segments, loading };
}

import { transcriptSegmentSchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";
import { jsonError, readJson } from "@/lib/api";
import { clientKey, rateLimit, RATE_LIMIT, withRateLimitHeaders } from "@/lib/rate-limit";
import { jsonResponse, logEvent, requestIdFor } from "@/lib/observability";
import { livekitIdentityBelongsToUser } from "@/lib/transcript/identity";

export async function GET(request: Request) {
  const requestId = requestIdFor(request);
  const meetingId = new URL(request.url).searchParams.get("meetingId");
  if (!meetingId || !/^[0-9a-f-]{36}$/i.test(meetingId)) {
    return jsonError("Invalid meeting.", 400, undefined, requestId);
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return jsonError("Authentication required.", 401, "unauthorized", requestId);
  }
  const { data, error } = await supabase
    .from("meeting_transcript_segments")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("sequence", { ascending: true })
    .limit(500);
  if (error) return jsonError("Couldn't load the transcript.", 403, "forbidden", requestId);
  return jsonResponse({ segments: data }, requestId);
}

export async function POST(request: Request) {
  const requestId = requestIdFor(request);
  const parsed = transcriptSegmentSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid transcript segment.", 400, undefined, requestId);
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return jsonError("Authentication required.", 401, "unauthorized", requestId);
  if (!livekitIdentityBelongsToUser(parsed.data.livekitIdentity, auth.user.id)) {
    return jsonError("Participant identity mismatch.", 403, "forbidden", requestId);
  }

  const limited = await rateLimit(
    `transcript:${parsed.data.meetingId}:${auth.user.id}:${clientKey(request)}`,
    RATE_LIMIT.transcriptInsert.limit,
    RATE_LIMIT.transcriptInsert.windowMs,
  );
  if (!limited.ok) {
    return withRateLimitHeaders(jsonError("Too many transcript segments.", 429, undefined, requestId), limited);
  }

  const { data, error } = await supabase.rpc("insert_transcript_segment", {
    p_meeting_id: parsed.data.meetingId,
    p_livekit_identity: parsed.data.livekitIdentity,
    p_text: parsed.data.text,
    p_started_at: parsed.data.startedAt,
    p_ended_at: parsed.data.endedAt,
  });
  if (error || !data?.[0]) {
    logEvent("warn", "transcript.insert_rejected", { requestId, meetingId: parsed.data.meetingId });
    return jsonError("Couldn't save this transcript segment.", 403, "forbidden", requestId);
  }
  return withRateLimitHeaders(jsonResponse({ segment: data[0] }, requestId, { status: 201 }), limited);
}

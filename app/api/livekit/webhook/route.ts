import { WebhookReceiver } from "livekit-server-sdk";
import { z } from "zod";
import { getServerEnv } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseParticipantAttributes } from "@/lib/livekit/types";
import {
  jsonResponse,
  logEvent,
  requestIdFor,
} from "@/lib/observability";

export const runtime = "nodejs";

const uuidSchema = z.string().uuid();
const PARTICIPANT_EVENTS = new Set([
  "participant_joined",
  "participant_left",
  "participant_connection_aborted",
]);

function eventDate(seconds: bigint, fallback = new Date()): Date {
  const value = Number(seconds);
  return Number.isSafeInteger(value) && value > 0
    ? new Date(value * 1000)
    : fallback;
}

export async function POST(request: Request) {
  const requestId = requestIdFor(request);
  const startedAt = performance.now();
  const env = getServerEnv();
  const body = await request.text();
  const receiver = new WebhookReceiver(
    env.LIVEKIT_API_KEY,
    env.LIVEKIT_API_SECRET,
  );

  let webhook;
  try {
    webhook = await receiver.receive(
      body,
      request.headers.get("authorization") ?? undefined,
    );
  } catch {
    logEvent("warn", "livekit.webhook_rejected", { requestId });
    return jsonResponse({ error: "Invalid webhook signature." }, requestId, { status: 401 });
  }

  if (!PARTICIPANT_EVENTS.has(webhook.event)) {
    return jsonResponse({ ok: true, ignored: true }, requestId);
  }

  const participant = webhook.participant;
  const room = webhook.room;
  const attributes = parseParticipantAttributes(participant?.attributes);
  const meetingId = uuidSchema.safeParse(attributes.meetingId);
  const userId = uuidSchema.safeParse(attributes.userId);

  if (
    !webhook.id ||
    !participant?.sid ||
    !participant.identity ||
    !room?.name ||
    !meetingId.success ||
    !userId.success
  ) {
    logEvent("warn", "livekit.webhook_malformed", {
      requestId,
      webhookId: webhook.id || "missing",
      eventType: webhook.event,
    });
    return jsonResponse({ ok: true, ignored: true }, requestId);
  }

  const occurredAt = eventDate(webhook.createdAt);
  const joinedAt = eventDate(participant.joinedAt, occurredAt);
  const admin = createAdminClient();
  const { data: processed, error } = await admin.rpc(
    "process_livekit_participant_webhook",
    {
      p_event_id: webhook.id,
      p_event_type: webhook.event,
      p_meeting_id: meetingId.data,
      p_user_id: userId.data,
      p_room_name: room.name,
      p_participant_sid: participant.sid,
      p_identity: participant.identity,
      p_display_name: participant.name?.trim() || "Participant",
      p_region: participant.region || "",
      p_joined_at: joinedAt.toISOString(),
      p_event_at: occurredAt.toISOString(),
      p_disconnect_reason: participant.disconnectReason,
    },
  );

  if (error) {
    logEvent("error", "livekit.webhook_persistence_failed", {
      requestId,
      webhookId: webhook.id,
      eventType: webhook.event,
      databaseCode: error.code,
    });
    return jsonResponse({ error: "Webhook persistence failed." }, requestId, { status: 500 });
  }

  logEvent("info", "livekit.webhook_processed", {
    requestId,
    webhookId: webhook.id,
    eventType: webhook.event,
    processed: Boolean(processed),
    durationMs: Math.round(performance.now() - startedAt),
  });
  return jsonResponse({ ok: true, processed }, requestId);
}

"use client";

import * as Y from "yjs";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from "y-protocols/awareness";
import type { SupabaseClientBrowser } from "@/lib/supabase/client";

const MESSAGE_EVENT = "yjs-message";
const AWARENESS_EVENT = "yjs-awareness";
const RESYNC_INTERVAL_MS = 5000;
const SAVE_DEBOUNCE_MS = 400;

type Listener = (...args: unknown[]) => void;

interface SupabaseYjsProviderOptions {
  id: string;
  channel: string;
}

/**
 * Minimal Yjs sync provider over an existing Supabase project.
 *
 * Live updates are relayed through a Supabase Realtime *broadcast* channel and
 * the latest merge is persisted to a single row (per meeting) in Postgres so
 * late joiners can hydrate. Awareness (presence) rides the same channel.
 */
export class SupabaseYjsProvider {
  readonly doc: Y.Doc;
  readonly awareness: Awareness;

  private readonly supabase: SupabaseClientBrowser;
  private readonly id: string;
  private readonly channelName: string;
  private channel: ReturnType<SupabaseClientBrowser["channel"]> | null = null;
  private resyncInterval: ReturnType<typeof setInterval> | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private ready: Promise<void>;
  private readyResolve: () => void = () => {};
  private online = false;
  private destroyed = false;
  private listeners = new Map<string, Set<Listener>>();

  constructor(
    doc: Y.Doc,
    supabase: SupabaseClientBrowser,
    options: SupabaseYjsProviderOptions,
  ) {
    this.doc = doc;
    this.supabase = supabase;
    this.id = options.id;
    this.channelName = options.channel;
    this.awareness = new Awareness(doc);

    this.ready = new Promise((resolve) => {
      this.readyResolve = resolve;
    });

    this.connect();
    this.doc.on("update", this.onDocumentUpdate);
    this.awareness.on("update", this.onAwarenessUpdate);
  }

  on(event: string, cb: Listener) {
    const set = this.listeners.get(event) ?? new Set<Listener>();
    set.add(cb);
    this.listeners.set(event, set);
  }

  off(event: string, cb: Listener) {
    this.listeners.get(event)?.delete(cb);
  }

  private emit(event: string, ...args: unknown[]) {
    this.listeners.get(event)?.forEach((cb) => cb(...args));
  }

  private async connect() {
    const channel = this.supabase.channel(this.channelName);
    this.channel = channel;

    channel
      .on("broadcast", { event: MESSAGE_EVENT }, ({ payload }) => {
        if (Array.isArray(payload) && payload.length > 0) {
          this.applyUpdate(Uint8Array.from(payload));
        }
      })
      .on("broadcast", { event: AWARENESS_EVENT }, ({ payload }) => {
        if (Array.isArray(payload) && payload.length > 0) {
          const update = Uint8Array.from(payload);
          applyAwarenessUpdate(this.awareness, update, this);
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          this.online = true;
          this.emit("status", true);
          void this.hydrate();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          this.emit("status", false);
        }
      });

    this.resyncInterval = setInterval(() => {
      this.broadcastState(Y.encodeStateAsUpdate(this.doc));
    }, RESYNC_INTERVAL_MS);
  }

  private async hydrate() {
    try {
      const { data, error } = await this.supabase
        .from("meeting_notes")
        .select("state")
        .eq("meeting_id", this.id)
        .single();

      if (!error && data && Array.isArray(data.state) && data.state.length > 0) {
        this.applyUpdate(Uint8Array.from(data.state));
      } else {
        // First time this meeting touches notes — make sure a row exists so
        // subsequent saves match, without clobbering an existing row.
        await this.supabase.from("meeting_notes").upsert(
          { meeting_id: this.id, state: [] },
          { onConflict: "meeting_id", ignoreDuplicates: true },
        );
      }
    } catch {
      // Ignore — the broadcast channel still syncs live edits.
    } finally {
      this.readyResolve();
    }
  }

  private applyUpdate(update: Uint8Array) {
    Y.applyUpdate(this.doc, update, this);
  }

  private onDocumentUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === this || this.destroyed) return;
    this.broadcastState(update);
    this.scheduleSave();
  };

  private onAwarenessUpdate = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    if (origin === this) return;
    const changed = added.concat(updated, removed);
    const awarenessUpdate = encodeAwarenessUpdate(this.awareness, changed);
    this.broadcastState(awarenessUpdate, AWARENESS_EVENT);
  };

  private broadcastState(update: Uint8Array, event = MESSAGE_EVENT) {
    if (!this.channel || !this.online) return;
    void this.channel.send({
      type: "broadcast",
      event,
      payload: Array.from(update),
    });
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      void this.savePersisted();
    }, SAVE_DEBOUNCE_MS);
  }

  private async savePersisted() {
    if (this.destroyed) return;
    await this.ready;
    const state = Array.from(Y.encodeStateAsUpdate(this.doc));
    const { error } = await this.supabase
      .from("meeting_notes")
      .update({ state })
      .eq("meeting_id", this.id);
    if (error) {
      this.emit("error", error);
      return;
    }
    this.emit("saved");
  }

  destroy() {
    this.destroyed = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    if (this.resyncInterval) clearInterval(this.resyncInterval);
    this.doc.off("update", this.onDocumentUpdate);
    this.awareness.off("update", this.onAwarenessUpdate);
    this.awareness.destroy();
    if (this.channel) {
      void this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
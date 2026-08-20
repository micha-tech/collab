"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { createClient } from "@/lib/supabase/client";
import { SupabaseYjsProvider } from "@/lib/collab/supabase-yjs-provider";

const NOTES_KEY = "notes";
const LOCAL_ORIGIN = "local";

const EDITOR_COLORS = [
  "#4f8cff",
  "#34c77b",
  "#f5a623",
  "#e055a0",
  "#8e6ce0",
  "#22b8cf",
  "#e05252",
  "#9aa0a6",
];

export interface SharedNotes {
  value: string;
  setValue: (next: string) => void;
  editors: string[];
  connected: boolean;
  syncing: boolean;
}

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return EDITOR_COLORS[hash % EDITOR_COLORS.length];
}

export function useSharedNotes(
  meetingId: string,
  displayName: string,
): SharedNotes {
  const [value, setValueState] = useState("");
  const [editors, setEditors] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(true);

  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<SupabaseYjsProvider | null>(null);
  const valueRef = useRef("");

  const applyRemoteValue = useCallback(() => {
    const doc = docRef.current;
    if (!doc) return;
    const next = doc.getText(NOTES_KEY).toString();
    if (next !== valueRef.current) {
      valueRef.current = next;
      setValueState(next);
    }
  }, []);

  useEffect(() => {
    const doc = new Y.Doc();
    const provider = new SupabaseYjsProvider(doc, createClient(), {
      id: meetingId,
      channel: `meeting-notes-${meetingId}`,
    });
    docRef.current = doc;
    providerRef.current = provider;

    const yText = doc.getText(NOTES_KEY);
    valueRef.current = yText.toString();
    setValueState(valueRef.current);

    const updateEditors = () => {
      const names: string[] = [];
      provider.awareness.getStates().forEach((state) => {
        const user = state.user as { name?: string } | undefined;
        if (user?.name) names.push(user.name);
      });
      setEditors(names);
    };

    const onStatus = (...args: unknown[]) => {
      setConnected(Boolean(args[0]));
      if (args[0]) setSyncing(false);
    };

    provider.on("status", onStatus);
    yText.observe(applyRemoteValue);
    provider.awareness.on("update", updateEditors);

    provider.awareness.setLocalStateField("user", {
      name: displayName || "You",
      color: colorFor(displayName || "You"),
    });
    updateEditors();

    return () => {
      provider.off("status", onStatus);
      yText.unobserve(applyRemoteValue);
      provider.awareness.off("update", updateEditors);
      provider.destroy();
      doc.destroy();
      docRef.current = null;
      providerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, displayName]);

  const setValue = useCallback((next: string) => {
    const doc = docRef.current;
    if (!doc) return;
    const yText = doc.getText(NOTES_KEY);
    const current = yText.toString();
    if (next === current) return;

    // Smallest diff between the textarea value and the Yjs text, so remote
    // edits don't get clobbered by a full-write of stale input.
    let prefix = 0;
    const maxPrefix = Math.min(current.length, next.length);
    while (
      prefix < maxPrefix &&
      current.charCodeAt(prefix) === next.charCodeAt(prefix)
    ) {
      prefix++;
    }
    let oldEnd = current.length;
    let newEnd = next.length;
    while (
      oldEnd > prefix &&
      newEnd > prefix &&
      current.charCodeAt(oldEnd - 1) === next.charCodeAt(newEnd - 1)
    ) {
      oldEnd--;
      newEnd--;
    }

    doc.transact(() => {
      if (oldEnd > prefix) yText.delete(prefix, oldEnd - prefix);
      if (newEnd > prefix) yText.insert(prefix, next.slice(prefix, newEnd));
    }, LOCAL_ORIGIN);

    valueRef.current = next;
    setValueState(next);
  }, []);

  return { value, setValue, editors, connected, syncing };
}
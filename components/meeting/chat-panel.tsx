"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CHAT_PAGE_SIZE, CHAT_MAX_LENGTH } from "@/lib/constants";
import { formatClockTime } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { X, Send, MessageSquare } from "lucide-react";
import type { MeetingMessage } from "@/types";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  open: boolean;
  meetingId: string;
  displayName: string;
  onClose: () => void;
  onNewMessage: (hasUnread: boolean) => void;
}

export function ChatPanel({
  open,
  meetingId,
  displayName,
  onClose,
  onNewMessage,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<MeetingMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendError, setSendError] = useState<string | null>(null);
  const [stickToBottom, setStickToBottom] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const loadedRef = useRef(false);
  const initializedRef = useRef(false);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const loadHistory = useCallback(async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("created_at", { ascending: false })
      .range(0, CHAT_PAGE_SIZE - 1);

    if (!error && data) {
      const rows = (data as MeetingMessage[]).sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      setMessages(rows);
      setStickToBottom(true);
    } else if (error) {
      console.error("loadHistory failed", error.message);
    }
    setLoading(false);
  }, [meetingId]);

  // Subscribe once, regardless of panel open state, so unread counts work.
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    void loadHistory();
    void createClient()
      .auth.getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));

    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `meeting_id=eq.${meetingId}`,
        },
        (payload) => {
          const incoming = payload.new as MeetingMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming].sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
            );
          });
          if (!openRef.current) {
            onNewMessage(true);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, loadHistory]);

  // Mark chat as read when opened.
  useEffect(() => {
    if (open) {
      onNewMessage(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-scroll.
  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, stickToBottom]);

  useEffect(() => {
    if (open && !loadedRef.current) {
      void loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setStickToBottom(distance < 48);
  };

  const sendMessage = async () => {
    const body = draft.trim();
    if (!body || !userId) return;
    setSendError(null);

    const optimistic: MeetingMessage = {
      id: crypto.randomUUID(),
      meeting_id: meetingId,
      sender_id: userId,
      sender_name: displayName,
      body,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    setStickToBottom(true);

    const supabase = createClient();
    const { error } = await supabase.from("messages").insert({
      meeting_id: meetingId,
      sender_id: userId,
      sender_name: displayName,
      body,
    });

    if (error) {
      console.error("sendMessage failed", error.message);
      setMessages((prev) =>
        prev.filter((m) => m.id !== optimistic.id),
      );
      setDraft(body);
      setSendError(
        error.code === "42501" ||
        error.message.includes("row-level security") ||
        error.code === "23514"
          ? "You can only message after joining the meeting."
          : "Couldn't send that message. Please try again.",
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  return (
    <aside
      aria-label="Meeting chat"
      aria-hidden={!open}
      inert={!open}
      className={cn(
        "absolute inset-y-0 right-0 z-20 flex w-full flex-col border-l border-room-border bg-room-surface transition-transform duration-200 sm:w-[360px]",
        open ? "translate-x-0" : "translate-x-full",
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-room-border px-4">
        <h2 className="flex items-center gap-2 text-sm font-medium text-room-fg">
          <MessageSquare className="size-4 text-room-muted" />
          Chat
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="rounded-md p-1.5 text-room-muted transition-colors hover:bg-room-surface-elevated hover:text-room-fg"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="meeting-scroll flex-1 overflow-y-auto" ref={listRef} onScroll={handleScroll}>
        {loading ? (
          <div className="flex h-full items-center justify-center text-room-subtle">
            <Spinner className="size-5 text-room-subtle" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <MessageSquare className="size-8 text-room-subtle" />
            <p className="text-sm text-room-muted">No messages yet.</p>
            <p className="text-xs text-room-subtle">
              Say hello to everyone in the meeting.
            </p>
          </div>
        ) : (
          <div className="space-y-4 px-4 py-4">
            {messages.map((message) => {
              const isMine = message.sender_id === userId;
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2.5",
                    isMine && "flex-row-reverse",
                  )}
                >
                  <Avatar
                    name={message.sender_name}
                    size="sm"
                    className="mt-0.5 size-7 text-[11px]"
                  />
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm",
                      isMine
                        ? "rounded-br-md bg-accent text-white"
                        : "rounded-bl-md bg-room-surface-elevated text-room-fg",
                    )}
                  >
                    {!isMine && (
                      <div className="mb-0.5 text-[11px] font-medium text-room-muted">
                        {message.sender_name}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words">
                      {message.body}
                    </p>
                    <div
                      className={cn(
                        "mt-1 text-right text-[10px]",
                        isMine ? "text-white/70" : "text-room-subtle",
                      )}
                    >
                      {formatClockTime(message.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!stickToBottom && messages.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setStickToBottom(true);
            const el = listRef.current;
            if (el) el.scrollTop = el.scrollHeight;
          }}
          className="absolute bottom-20 right-1/2 translate-x-1/2 rounded-full border border-room-border bg-room-surface-elevated px-3 py-1.5 text-xs text-room-muted shadow-lg transition-colors hover:text-room-fg"
        >
          New messages ↓
        </button>
      )}

      <div className="border-t border-room-border p-3">
        {sendError && (
          <p role="alert" className="mb-2 text-xs text-danger">
            {sendError}
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, CHAT_MAX_LENGTH))}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            rows={1}
            aria-label="Message"
            className="flex max-h-28 min-h-[44px] flex-1 resize-none rounded-lg border border-room-border bg-room-surface-elevated px-3 py-2.5 text-sm text-room-fg placeholder:text-room-subtle focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={!draft.trim()}
            aria-label="Send message"
            className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-white transition-colors hover:bg-accent-strong disabled:opacity-40"
          >
            <Send className="size-4" />
          </button>
        </div>
        <p className="mt-1.5 text-right text-[10px] text-room-subtle">
          Enter to send · Shift+Enter for a new line
        </p>
      </div>
    </aside>
  );
}

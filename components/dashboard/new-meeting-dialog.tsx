"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Video } from "lucide-react";
import { meetingUrl } from "@/lib/utils";
import { DEFAULT_MEETING_TITLE, MAX_TITLE_LENGTH } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

interface NewMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewMeetingDialog({ open, onOpenChange }: NewMeetingDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState(DEFAULT_MEETING_TITLE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || DEFAULT_MEETING_TITLE }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Couldn't create the meeting.");
      }
      const data = (await res.json()) as { meeting: { slug: string } };
      setCreatedSlug(data.meeting.slug);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the meeting.");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!createdSlug) return;
    await navigator.clipboard.writeText(meetingUrl(createdSlug));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const joinNow = () => {
    if (!createdSlug) return;
    onOpenChange(false);
    router.push(`/m/${createdSlug}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {createdSlug === null ? (
          <>
            <DialogHeader>
              <DialogTitle>New meeting</DialogTitle>
              <DialogDescription>
                Give the meeting a name, then share the link with anyone.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="meeting-title">Meeting title</Label>
              <Input
                id="meeting-title"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE_LENGTH))}
                placeholder="Product design review"
                autoFocus
                disabled={busy}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={() => void create()} disabled={busy}>
                {busy ? <Spinner /> : <Video className="size-4" />}
                {busy ? "Creating…" : "Create meeting"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Meeting ready</DialogTitle>
              <DialogDescription>
                Share this link so people can join instantly.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border border-border-line bg-surface-subtle px-3 py-2.5 font-mono text-sm break-all text-foreground">
              {meetingUrl(createdSlug)}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => void copyLink()}>
                {copied ? (
                  <Check className="size-4 text-accent" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied ? "Copied" : "Copy link"}
              </Button>
              <Button onClick={joinNow}>
                <Video className="size-4" />
                Join now
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
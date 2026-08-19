"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogIn, Video } from "lucide-react";
import { extractMeetingSlug } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function HomeJoinForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleJoin = () => {
    const slug = extractMeetingSlug(value);
    if (!slug) {
      setError("Paste a full meeting link or a meeting code.");
      return;
    }
    setError(null);
    router.push(`/m/${slug}`);
  };

  return (
    <form
      className="flex w-full max-w-lg flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        handleJoin();
      }}
      noValidate
    >
      <div className="flex-1">
        <label htmlFor="join-link" className="sr-only">
          Meeting link or code
        </label>
        <Input
          id="join-link"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Paste meeting link or code"
          className="h-12 bg-surface"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(error)}
        />
        {error && (
          <p role="alert" className="mt-1.5 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
      <Button
        type="submit"
        size="lg"
        variant="secondary"
        className="h-12 sm:h-12"
      >
        <LogIn className="size-4" />
        Join
      </Button>
    </form>
  );
}

export function StartMeetingButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleStart = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled meeting" }),
      });
      if (res.status === 401 || res.status === 403) {
        toast(
          res.status === 401
            ? "Create a free account to start a meeting."
            : "Guest accounts can't create meetings. Create an account.",
        );
        return;
      }
      if (!res.ok) {
        toast("Couldn't start a meeting. Please try again.");
        return;
      }
      const data = (await res.json()) as { meeting: { slug: string } };
      router.push(`/m/${data.meeting.slug}`);
    } catch {
      toast("Couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="lg" className="h-12 px-6 text-base" onClick={() => void handleStart()} disabled={busy}>
      {busy ? <Spinner /> : <Video className="size-5" />}
      {busy ? "Creating…" : "Start a meeting"}
    </Button>
  );
}
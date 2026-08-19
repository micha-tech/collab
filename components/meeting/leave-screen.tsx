"use client";

import Link from "next/link";
import { Video, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LeaveScreen({
  meetingTitle,
  onRejoin,
}: {
  meetingTitle: string;
  onRejoin: () => void;
}) {
  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center gap-3 bg-room px-4 text-center">
      <div className="size-16 rounded-full border border-room-border bg-room-surface text-room-muted" />
      <h1 className="text-xl font-semibold text-room-fg">You left the meeting.</h1>
      <p className="max-w-sm text-sm text-room-muted">
        {meetingTitle} is still active. You can rejoin at any time.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" onClick={onRejoin} className="bg-accent text-white hover:bg-accent-strong">
          <Video className="size-5" />
          Rejoin
        </Button>
        <Button size="lg" variant="outline" asChild className="border-room-border text-room-fg hover:bg-room-surface">
          <Link href="/">
            <Home className="size-5" />
            Back to home
          </Link>
        </Button>
      </div>
    </div>
  );
}
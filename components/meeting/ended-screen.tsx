"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EndedScreen({ title }: { title: string }) {
  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 bg-room px-4 text-center">
      <div className="flex size-20 items-center justify-center rounded-full border border-room-border bg-room-surface text-room-fg">
        <span className="text-2xl font-semibold">V</span>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-room-fg">
        This meeting has ended.
      </h1>
      <p className="text-sm text-room-muted">{title}</p>
      <div className="mt-2">
        <Button size="lg" variant="outline" asChild className="border-room-border text-room-fg hover:bg-room-surface">
          <Link href="/">
            <Home className="size-5" />
            Back to V One Collab
          </Link>
        </Button>
      </div>
    </div>
  );
}
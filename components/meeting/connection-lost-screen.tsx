"use client";

import { useState } from "react";
import { LoaderPinwheel, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function ConnectionLostScreen({
  onRejoin,
}: {
  onRejoin: () => void;
}) {
  const [rejoining, setRejoining] = useState(false);

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center gap-3 bg-room px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full border border-room-border bg-room-surface text-room-muted">
        <WifiOff className="size-7" />
      </div>
      <h1 className="text-xl font-semibold text-room-fg">Connection lost</h1>
      <p className="max-w-sm text-sm text-room-muted">
        We couldn&apos;t keep your connection alive. Try rejoining the meeting.
      </p>
      <div className="mt-4">
        <Button
          size="lg"
          disabled={rejoining}
          onClick={() => {
            setRejoining(true);
            onRejoin();
          }}
        >
          {rejoining ? <Spinner /> : <LoaderPinwheel className="size-5" />}
          Rejoin
        </Button>
      </div>
    </div>
  );
}
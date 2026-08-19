"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface EndMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function EndMeetingDialog({
  open,
  onOpenChange,
  onConfirm,
}: EndMeetingDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch {
      setError("Couldn't end the meeting. Please try again.");
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>End meeting for everyone?</DialogTitle>
          <DialogDescription>
            Everyone currently connected will be disconnected, and this meeting
            link will no longer accept new participants.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void confirm()}
            disabled={busy}
          >
            {busy ? <Spinner /> : null}
            End meeting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
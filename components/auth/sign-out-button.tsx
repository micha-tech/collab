"use client";

import { useTransition } from "react";
import { signOutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      disabled={pending}
      onClick={() => startTransition(async () => signOutAction())}
    >
      {pending ? <Spinner className="size-4" /> : null}
      Sign out
    </Button>
  );
}
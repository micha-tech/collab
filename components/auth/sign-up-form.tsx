"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUpAction, {});

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.error ? (
        <div
          role="alert"
          className="rounded-lg border border-danger-soft bg-danger-soft px-3 py-2 text-sm text-danger-strong"
        >
          {state.error}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="displayName">Your name</Label>
        <Input
          id="displayName"
          name="displayName"
          autoComplete="name"
          placeholder="Victor Osei"
          required
          disabled={pending}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
          disabled={pending}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          required
          disabled={pending}
          className="h-11"
        />
        <p className="text-xs text-subtle">Use at least 8 characters.</p>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Spinner /> : null}
        {pending ? "Creating your account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/auth/sign-in" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function SignInForm() {
  const [state, formAction, pending] = useActionState(signInAction, {});

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
          autoComplete="current-password"
          placeholder="••••••••"
          required
          disabled={pending}
          className="h-11"
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Spinner /> : null}
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/auth/sign-up" className="font-medium text-accent hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}
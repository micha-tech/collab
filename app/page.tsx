import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BrandMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";
import { HomeJoinForm, StartMeetingButton } from "@/components/home/home-join";

export const metadata: Metadata = {
  title: "Meet. Talk. Collaborate.",
  description:
    "Simple video meetings built for getting things done — create a meeting, share the link, and join instantly.",
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedIn = Boolean(user && !user.is_anonymous);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
        <Link href="/" aria-label="V One Collab home">
          <BrandMark />
        </Link>
        <nav className="flex items-center gap-2">
          {signedIn ? (
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/auth/sign-in">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/sign-up">Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-14">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Meet. Talk.{" "}
            <span className="text-accent">Collaborate.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted sm:text-lg">
            Simple video meetings built for getting things done. Create a
            meeting, share the link, and join instantly — no installs, no
            accounts for guests.
          </p>
        </div>

        <div className="mt-10 w-full">
          <div className="flex justify-center">
            <StartMeetingButton />
          </div>

          <div
            className="mt-8 flex items-center justify-center gap-3 text-xs text-subtle"
            aria-hidden
          >
            <span className="h-px w-16 bg-border-strong" />
            <span>or join an existing meeting</span>
            <span className="h-px w-16 bg-border-strong" />
          </div>

          <div className="mt-6 flex justify-center">
            <HomeJoinForm />
          </div>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-6 pb-8 text-center text-xs text-subtle">
        V One Collab — voice, video, screen sharing and chat in your browser.
      </footer>
    </div>
  );
}
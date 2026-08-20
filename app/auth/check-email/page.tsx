import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Check your email",
};

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center px-6">
        <Link href="/" aria-label="V One Collab home">
          <BrandMark />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Check your inbox</h1>
          <p className="mt-3 text-sm text-muted">
            We sent you a confirmation link to finish creating your account.
            The link expires shortly after it&apos;s sent.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Button asChild variant="outline">
              <Link href="/auth/sign-in">Back to sign in</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
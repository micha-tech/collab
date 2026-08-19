import type { ReactNode } from "react";
import { BrandMark } from "@/components/layout/brand-mark";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center px-6">
        <Link href="/" aria-label="V One Collab home">
          <BrandMark />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-6 pb-16 pt-8 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm">{children}</div>
      </main>
      <footer className="pb-6 text-center text-xs text-subtle">
        Secure, instant video collaboration
      </footer>
    </div>
  );
}
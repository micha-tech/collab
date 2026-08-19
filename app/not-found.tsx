import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-room px-6 text-center">
      <p className="text-sm font-medium text-room-subtle">404</p>
      <h1 className="text-2xl font-semibold tracking-tight text-room-fg">
        Meeting not found
      </h1>
      <p className="max-w-sm text-sm text-room-muted">
        This link doesn&apos;t point to a meeting, or the meeting
        doesn&apos;t exist.
      </p>
      <Button asChild size="lg" className="mt-4">
        <Link href="/">Back to V One Collab</Link>
      </Button>
    </div>
  );
}
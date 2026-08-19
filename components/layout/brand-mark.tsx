import { cn } from "@/lib/utils";

export function VMark({
  className,
  tone = "accent",
}: {
  className?: string;
  tone?: "accent" | "dark";
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("size-6", className)}
    >
      <path
        d="M5 4.5 12 20l7-15.5"
        stroke={tone === "accent" ? "var(--accent)" : "var(--room-fg)"}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandMark({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <span
      className={cn(
        "inline-flex select-none items-center gap-2 font-semibold tracking-tight",
        tone === "dark" ? "text-foreground" : "text-room-fg",
        className,
      )}
    >
      <VMark tone={tone === "dark" ? "accent" : "accent"} className="size-5" />
      <span>
        <span className="text-accent">V</span> One{" "}
        <span className={tone === "dark" ? "text-muted" : "text-room-muted"}>
          Collab
        </span>
      </span>
    </span>
  );
}
import { cn } from "@/lib/utils";

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
        "inline-flex select-none items-center font-semibold tracking-tight",
        tone === "dark" ? "text-foreground" : "text-room-fg",
        className,
      )}
    >
      V-One Collab
    </span>
  );
}
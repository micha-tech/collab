import * as React from "react";
import { cn, initials } from "@/lib/utils";

const AVATAR_PALETTE = [
  "bg-indigo-500/90",
  "bg-violet-500/90",
  "bg-sky-600/90",
  "bg-emerald-600/80",
  "bg-rose-500/85",
  "bg-amber-600/85",
  "bg-teal-600/80",
];

function paletteIndex(name: string, seed = 0): number {
  let hash = seed;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash % AVATAR_PALETTE.length;
}

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  size?: "sm" | "md" | "lg";
}

function Avatar({ name, size = "md", className, ...props }: AvatarProps) {
  const sizeClass =
    size === "sm" ? "size-7 text-[11px]" : size === "lg" ? "size-20 text-2xl" : "size-10 text-sm";
  return (
    <div
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none",
        sizeClass,
        AVATAR_PALETTE[paletteIndex(name)],
        className,
      )}
      {...props}
    >
      {initials(name)}
    </div>
  );
}

export { Avatar };
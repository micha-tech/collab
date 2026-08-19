import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string): string {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) return "?";
  const parts = clean.split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(sec)}`;
  return `${pad(m)}:${pad(sec)}`;
}

export function formatClockTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function relativeMeetingDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThat = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfToday.getTime() - startOfThat.getTime()) / 86_400_000);

  if (dayDiff === 0) {
    return `Today ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff > 1 && dayDiff < 7) {
    return date.toLocaleDateString([], { weekday: "long" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

/**
 * Parse pasted text into a meeting slug.
 * Accepts a full https://host/m/<slug> URL or a bare meeting code.
 */
export function extractMeetingSlug(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    const match = url.pathname.match(/^\/m\/([A-Za-z0-9_-]+)\/?$/);
    return match ? match[1] : null;
  } catch {
    // Not a URL — treat as candidate meeting code.
    if (/^[A-Za-z0-9_-]{4,64}$/.test(raw)) return raw;
    return null;
  }
}

export function meetingUrl(slug: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/m/${slug}`;
}

export function normalizeDisplayName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, 80);
}
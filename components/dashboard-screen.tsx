"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Copy,
  LogIn,
  Plus,
} from "lucide-react";
import type { Meeting } from "@/types";
import { meetingUrl, relativeMeetingDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NewMeetingDialog } from "@/components/dashboard/new-meeting-dialog";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface DashboardScreenProps {
  profile: { id: string; display_name: string; email?: string };
  recentMeetings: Meeting[];
}

function greeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardScreen({ profile, recentMeetings }: DashboardScreenProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const displayName = profile.display_name.trim() || "there";
  const firstName = displayName.split(" ")[0];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border-line bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-6">
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            V-One Collab
          </span>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button onClick={() => setDialogOpen(true)} className="hidden sm:inline-flex">
              <Plus className="size-4" />
              New meeting
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Account menu for ${displayName}`}
                  className="flex items-center gap-2 rounded-lg border border-border-line bg-surface px-2 py-1.5 transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  <Avatar name={displayName} size="sm" />
                  <span className="hidden max-w-32 truncate text-sm font-medium text-foreground sm:inline">
                    {firstName}
                  </span>
                  <ChevronDown className="size-4 text-muted" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                  {profile.email && (
                    <p className="truncate text-xs text-muted">{profile.email}</p>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <SignOutButton />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {greeting(new Date())}, {firstName}
            </h1>
            <p className="mt-1 text-sm text-muted">
              Start a meeting or jump into a recent one.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="sm:hidden">
            <Plus className="size-4" />
            New meeting
          </Button>
        </div>

        <section className="mt-10">
          <h2 className="text-sm font-medium uppercase tracking-wider text-subtle">
            Recent meetings
          </h2>

          {recentMeetings.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-surface-subtle/50 px-6 py-14 text-center">
              <p className="text-sm font-medium text-foreground">No meetings yet</p>
              <p className="mt-1 max-w-xs text-sm text-muted">
                Create your first meeting and share the link with anyone.
              </p>
              <Button className="mt-5" onClick={() => setDialogOpen(true)}>
                <Plus className="size-4" />
                New meeting
              </Button>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-border-line">
              {recentMeetings.map((meeting) => (
                <MeetingRow key={meeting.id} meeting={meeting} />
              ))}
            </ul>
          )}
        </section>
      </main>

      {dialogOpen && (
        <NewMeetingDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      )}
    </div>
  );
}

function MeetingRow({ meeting }: { meeting: Meeting }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const active = meeting.status === "active";
  const url = meetingUrl(meeting.slug);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      toast("Couldn't copy the link.");
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <li className="flex items-center gap-3 py-4 sm:gap-4">
      <button
        type="button"
        onClick={() => router.push(`/m/${meeting.slug}`)}
        className="min-w-0 flex-1 text-left"
        aria-label={`Open ${meeting.title}`}
      >
        <p className="truncate text-sm font-medium text-foreground hover:text-accent">
          {meeting.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {relativeMeetingDate(meeting.created_at)}
          <span className="mx-1.5 text-border-strong">·</span>
          {url}
        </p>
      </button>

      <Badge variant={active ? "default" : "outline"}>
        {active ? "Active" : "Ended"}
      </Badge>

      <div className="flex shrink-0 items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={() => void copyLink()} aria-label="Copy meeting link">
              {copied ? <Check className="size-4 text-accent" /> : <Copy className="size-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{copied ? "Copied" : "Copy link"}</TooltipContent>
        </Tooltip>

        <Button
          variant={active ? "default" : "outline"}
          size="sm"
          onClick={() => router.push(`/m/${meeting.slug}`)}
        >
          <LogIn className="size-4" />
          {active ? "Join" : "View"}
        </Button>
      </div>
    </li>
  );
}
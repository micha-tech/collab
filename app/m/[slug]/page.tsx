import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { meetingSlugSchema } from "@/lib/validation";
import { getMeetingBySlug } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { MeetingGateway } from "@/components/meeting/meeting-gateway";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Meeting",
};

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const parsed = meetingSlugSchema.safeParse(slug);
  if (!parsed.success) notFound();

  const meeting = await getMeetingBySlug(parsed.data);
  if (!meeting) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | undefined;
  if (user && !user.is_anonymous) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    displayName =
      (profile?.display_name as string | undefined)?.trim() ||
      user.email?.split("@")[0] ||
      undefined;
  }

  return (
    <MeetingGateway
      meeting={{
        id: meeting.id,
        slug: meeting.slug,
        title: meeting.title,
        host_id: meeting.host_id,
        status: meeting.status as "active" | "ended",
        allow_guests: meeting.allow_guests,
      }}
      initialUser={
        user
          ? {
              id: user.id,
              is_anonymous: Boolean(user.is_anonymous),
              displayName,
            }
          : null
      }
    />
  );
}
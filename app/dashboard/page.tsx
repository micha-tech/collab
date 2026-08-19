import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardScreen } from "@/components/dashboard/dashboard-screen";

export const metadata: Metadata = {
  title: "Dashboard",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.is_anonymous) {
    redirect("/auth/sign-in");
  }

  const [{ data: profile }, { data: recentMeetings }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("meetings")
      .select("*")
      .eq("host_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <DashboardScreen
      profile={{
        id: user.id,
        display_name: (profile?.display_name as string | undefined)?.trim() || user.email?.split("@")[0] || "there",
        email: user.email ?? undefined,
      }}
      recentMeetings={(recentMeetings ?? []) as NonNullable<typeof recentMeetings>}
    />
  );
}
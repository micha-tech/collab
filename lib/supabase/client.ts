import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/config";
import type { Database } from "@/types/supabase";

export type SupabaseClientBrowser = ReturnType<typeof createClient>;

export function createClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } =
    getPublicEnv();
  return createBrowserClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
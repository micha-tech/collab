import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/config";
import type { Database } from "@/types/supabase";

let admin: SupabaseClient<Database> | null = null;

export function createAdminClient(): SupabaseClient<Database> {
  if (admin) return admin;
  const env = getServerEnv();
  admin = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
  return admin;
}
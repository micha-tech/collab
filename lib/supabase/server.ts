import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicEnv } from "@/lib/config";
import type { Database } from "@/types/supabase";

/**
 * Supabase client for Server Components / Server Actions / Route Handlers.
 * Reads the auth session from the request cookie jar.
 */
export async function createClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } =
    getPublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Safe to ignore: called from a Server Component which cannot set
            // cookies. The proxy (proxy.ts) refreshes sessions where required.
          }
        },
      },
    },
  );
}
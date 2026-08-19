import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/config";

/**
 * Session-refresh proxy (Next.js 16 rename of middleware.ts).
 *
 * Only refreshes Supabase auth cookies; it does not enforce auth (meetings are
 * deliberately open to guests via URLs, and pages must decide at render time).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  let env: ReturnType<typeof getPublicEnv>;
  try {
    env = getPublicEnv();
  } catch {
    return response;
  }

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Only touch routes that carry app sessions. Skip API routes, Next internals
    // and static assets.
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
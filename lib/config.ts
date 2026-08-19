import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url()
    .describe("Supabase project URL, e.g. https://xxxx.supabase.co"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1)
    .describe("Supabase publishable (anon) key"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  LIVEKIT_URL: z.string().url().startsWith("wss://"),
  LIVEKIT_API_KEY: z.string().min(1),
  LIVEKIT_API_SECRET: z.string().min(16),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

type PublicEnv = z.infer<typeof publicEnvSchema>;

function readPublicEnv(): PublicEnv {
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
  if (!result.success) {
    throw new Error(
      `Missing public environment variables. Copy .env.example to .env.local and fill in the required values. Details: ${result.error.issues
        .map((i) => i.path.join("."))
        .join(", ")}`,
    );
  }
  return result.data;
}

let cachedPublic: PublicEnv | null = null;

/** Safe to import and call in browser code. Returns validated NEXT_PUBLIC_* values. */
export function getPublicEnv(): PublicEnv {
  if (typeof window !== "undefined") {
    cachedPublic = null;
  }
  if (!cachedPublic) {
    cachedPublic = readPublicEnv();
  }
  return cachedPublic;
}

/** Server-only. Must not be imported into client bundles. */
export function getServerEnv() {
  const result = serverEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    LIVEKIT_URL: process.env.LIVEKIT_URL,
    LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });

  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(
      `Invalid server environment. Missing or invalid: ${missing}. Check .env.local.`,
    );
  }
  return result.data;
}
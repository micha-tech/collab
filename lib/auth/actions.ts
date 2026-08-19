"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema } from "@/lib/validation";
import { normalizeDisplayName } from "@/lib/utils";

export interface AuthActionState {
  error?: string;
}

function actionState(error: string): AuthActionState {
  return { error };
}

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return actionState(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.status === 400 || error.code === "invalid_credentials") {
      return actionState("Invalid email or password.");
    }
    return actionState("We couldn't sign you in. Please try again.");
  }

  redirect("/dashboard");
}

export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return actionState(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: normalizeDisplayName(parsed.data.displayName) },
    },
  });

  if (error) {
    if (error.code === "user_already_exists") {
      return actionState("An account with that email already exists. Sign in instead.");
    }
    if (error.message.includes("password")) {
      return actionState("That password is too weak. Use at least 8 characters.");
    }
    return actionState("We couldn't create your account. Please try again.");
  }

  if (data.session) {
    redirect("/dashboard");
  }

  // Email confirmation required.
  redirect("/auth/check-email");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
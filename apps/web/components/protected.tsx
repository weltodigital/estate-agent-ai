import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Wraps the authenticated (`/dashboard`, `/properties`, …) route group.
 *
 * - No session → /login.
 * - Session but no public.users row (the "confirmed but never bootstrapped"
 *   state — happens when Supabase email confirmation is on and the user
 *   bailed at the "check your inbox" screen during signup) → /finish-setup.
 *
 * The finish-setup flow asks for the agency details the original signup form
 * captured and calls /v1/auth/bootstrap-agency to complete the chain.
 */
export async function Protected({ children }: { children: ReactNode }) {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile) {
    redirect("/finish-setup");
  }

  return <>{children}</>;
}

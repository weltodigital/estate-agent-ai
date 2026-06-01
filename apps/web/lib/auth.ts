"use client";

import type {
  AcceptInviteRequest,
  AcceptInviteResponse,
  BootstrapAgencyRequest,
  BootstrapAgencyResponse,
} from "@app/shared/schemas";
import { apiFetch } from "./api";
import { getSupabaseBrowserClient } from "./supabase/client";

/**
 * Two-step signup:
 *   1. Create the Supabase Auth user (handles email confirmation if enabled).
 *   2. Once we have a session, call /v1/auth/bootstrap-agency to create the
 *      agency, branch, and public.users row.
 *
 * If Supabase has email confirmation switched on, step 2 cannot run until the
 * user verifies. We surface that as a `needsConfirmation` outcome so the UI
 * can show "check your inbox".
 */
export async function signUpAndBootstrap(values: {
  email: string;
  password: string;
  full_name: string;
  agency_name: string;
  branch_postcode: string;
}): Promise<{ status: "ok"; result: BootstrapAgencyResponse } | { status: "needs_confirmation" }> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      data: { full_name: values.full_name },
      emailRedirectTo: `${window.location.origin}/login`,
    },
  });
  if (error) throw new Error(error.message);

  // No session yet → email confirmation required.
  if (!data.session) {
    return { status: "needs_confirmation" };
  }

  const body: BootstrapAgencyRequest = {
    full_name: values.full_name,
    agency_name: values.agency_name,
    branch_postcode: values.branch_postcode,
  };
  const result = await apiFetch<BootstrapAgencyResponse>("/v1/auth/bootstrap-agency", {
    method: "POST",
    body,
    accessToken: data.session.access_token,
  });
  return { status: "ok", result };
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function sendMagicLink(email: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/dashboard` },
  });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signOut();
}

/**
 * Accept-invite flow. Mirrors signup but calls /v1/auth/accept-invite instead
 * of /v1/auth/bootstrap-agency.
 */
export async function signUpAndAcceptInvite(values: {
  token: string;
  email: string;
  password: string;
  full_name: string;
}): Promise<{ status: "ok"; result: AcceptInviteResponse } | { status: "needs_confirmation" }> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      data: { full_name: values.full_name },
      emailRedirectTo: `${window.location.origin}/accept-invite?token=${values.token}`,
    },
  });
  if (error) throw new Error(error.message);

  if (!data.session) {
    return { status: "needs_confirmation" };
  }

  const body: AcceptInviteRequest = { token: values.token, full_name: values.full_name };
  const result = await apiFetch<AcceptInviteResponse>("/v1/auth/accept-invite", {
    method: "POST",
    body,
    accessToken: data.session.access_token,
  });
  return { status: "ok", result };
}

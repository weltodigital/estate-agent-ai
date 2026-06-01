"use client";

import { apiFetch } from "./api";
import { getSupabaseBrowserClient } from "./supabase/client";

/**
 * Browser-side API caller. Pulls the access token from the active Supabase
 * session and passes it to apiFetch.
 */
export async function callApi<T>(
  path: string,
  options: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown } = {},
): Promise<T> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("Not signed in.");
  }
  return apiFetch<T>(path, { ...options, accessToken: token });
}

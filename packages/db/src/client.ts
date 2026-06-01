import { createServerClient as createSsrServerClient } from "@supabase/ssr";
import { createBrowserClient as createSsrBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type CookieAdapter = {
  get(name: string): string | undefined;
  set(name: string, value: string, options?: Record<string, unknown>): void;
  remove(name: string, options?: Record<string, unknown>): void;
};

export function createBrowserClient(supabaseUrl: string, supabaseAnonKey: string) {
  return createSsrBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

export function createServerClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  cookies: CookieAdapter,
) {
  return createSsrServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name: string) => cookies.get(name),
      set: (name: string, value: string, options?: Record<string, unknown>) =>
        cookies.set(name, value, options),
      remove: (name: string, options?: Record<string, unknown>) => cookies.remove(name, options),
    },
  });
}

/**
 * Service-role client. Bypasses RLS. Use only for: Stripe webhooks, queue
 * workers, and admin tools. Each use site MUST document why service-role is
 * required.
 */
export function createServiceClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type SupabaseBrowserClient = ReturnType<typeof createBrowserClient>;
export type SupabaseServerClient = ReturnType<typeof createServerClient>;
export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

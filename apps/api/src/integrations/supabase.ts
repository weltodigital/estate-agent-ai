import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnv } from "../env.js";

let serviceClient: SupabaseClient | undefined;

/**
 * Service-role client. Bypasses RLS. Use ONLY for:
 *   - Stripe webhooks
 *   - Queue workers
 *   - Admin tooling
 *   - Bootstrapping flows where the user has no profile row yet
 * Every use site must document why service-role is required.
 */
export function getServiceClient(): SupabaseClient {
  if (!serviceClient) {
    const env = loadEnv();
    serviceClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serviceClient;
}

/**
 * Request-scoped client. Authenticated as the caller via their access token;
 * RLS applies as expected.
 */
export function getUserClient(accessToken: string): SupabaseClient {
  const env = loadEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

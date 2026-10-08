import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS, so use it only for writes that must
 * respect plan limits (after checking them), for Stripe webhooks, for the
 * public tracking endpoint and free scan, and for admin tools. Always scope
 * queries by org_id explicitly when using it.
 */
export function getSupabaseAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

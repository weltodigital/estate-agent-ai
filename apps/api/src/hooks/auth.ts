import type { FastifyReply, FastifyRequest } from "fastify";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "../env.js";
import { unauthorised } from "../errors.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
    };
    agencyId?: string;
  }
}

const env = loadEnv();

const PUBLIC_PATHS = new Set<string>([
  "/healthz",
  "/v1/webhooks/stripe",
]);

/**
 * Verifies the Supabase JWT on every authenticated request and attaches
 * `request.user` and `request.agencyId`. Routes in PUBLIC_PATHS bypass auth.
 *
 * For v1 we lazily fetch the agency_id from public.users using the service
 * role. Future revision: cache in Redis.
 */
export async function authHook(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  if (PUBLIC_PATHS.has(request.routeOptions.url ?? request.url)) {
    return;
  }

  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw unauthorised();
  }
  const accessToken = header.slice("Bearer ".length);

  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    throw unauthorised();
  }

  request.user = { id: data.user.id, email: data.user.email ?? "" };

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("agency_id")
    .eq("id", data.user.id)
    .single();

  if (!profileError && profile) {
    request.agencyId = profile.agency_id as string;
  }
}

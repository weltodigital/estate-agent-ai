import type { FastifyReply, FastifyRequest } from "fastify";
import { forbidden, unauthorised } from "../errors.js";
import { getServiceClient } from "../integrations/supabase.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      accessToken: string;
    };
    agencyId?: string;
  }
}

const PUBLIC_PATHS = new Set<string>(["/healthz", "/v1/webhooks/stripe"]);

/**
 * Routes that need a Supabase session but where the user has no public.users
 * row yet (the bootstrap moment). The hook attaches `request.user` but does
 * not require an `agencyId` for these.
 */
const PROFILE_OPTIONAL_PATHS = new Set<string>([
  "/v1/auth/bootstrap-agency",
  "/v1/auth/accept-invite",
]);

/**
 * Verifies the Supabase JWT on every authenticated request and attaches
 * `request.user` and `request.agencyId`. Routes in PUBLIC_PATHS bypass auth.
 *
 * For v1 we lazily fetch the agency_id from public.users via the service-role
 * client. Future revision: cache the agency_id in Redis keyed by user id.
 */
export async function authHook(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const routePath = request.routeOptions.url ?? request.url;
  if (PUBLIC_PATHS.has(routePath)) {
    return;
  }

  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw unauthorised();
  }
  const accessToken = header.slice("Bearer ".length);

  const supabase = getServiceClient();
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    throw unauthorised();
  }

  request.user = {
    id: data.user.id,
    email: data.user.email ?? "",
    accessToken,
  };

  const { data: profile } = await supabase
    .from("users")
    .select("agency_id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile && typeof profile.agency_id === "string") {
    request.agencyId = profile.agency_id;
    return;
  }

  if (!PROFILE_OPTIONAL_PATHS.has(routePath)) {
    throw forbidden();
  }
}

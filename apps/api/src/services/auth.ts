import { randomUUID } from "node:crypto";
import type { FastifyRequest } from "fastify";
import type {
  AcceptInviteRequest,
  AcceptInviteResponse,
  BootstrapAgencyRequest,
  BootstrapAgencyResponse,
  CreateInviteRequest,
  CreateInviteResponse,
  Invite,
} from "@app/shared/schemas";
import { loadEnv } from "../env.js";
import { AppError, badRequest, forbidden, unauthorised } from "../errors.js";
import { getUserClient } from "../integrations/supabase.js";

/**
 * Calls bootstrap_new_agency RPC on behalf of the caller. The RPC runs as
 * SECURITY DEFINER and reads auth.uid() from the JWT, so we must invoke it
 * through a user-scoped client.
 */
export async function bootstrapNewAgency(
  request: FastifyRequest,
  payload: BootstrapAgencyRequest,
): Promise<BootstrapAgencyResponse> {
  if (!request.user) {
    throw unauthorised();
  }

  const supabase = getUserClient(request.user.accessToken);
  const { data, error } = await supabase
    .rpc("bootstrap_new_agency", {
      p_full_name: payload.full_name,
      p_agency_name: payload.agency_name,
      p_branch_postcode: payload.branch_postcode,
    })
    .single<{ agency_id: string; branch_id: string; user_id: string }>();

  if (error) {
    if (error.message.includes("already belongs to an agency")) {
      throw new AppError({
        status: 409,
        code: "already_bootstrapped",
        message: "This account is already linked to an agency.",
      });
    }
    request.log.error({ err: error }, "bootstrap_new_agency failed");
    throw new AppError({
      status: 500,
      code: "bootstrap_failed",
      message: "Could not create your agency.",
    });
  }

  return {
    agency_id: data.agency_id,
    branch_id: data.branch_id,
    user_id: data.user_id,
  };
}

/**
 * Creates an invite token for a teammate. Requires the caller to be an admin
 * of their agency — RLS already enforces this on insert, so we just pass
 * through; the DB will reject if not admin.
 */
export async function createInvite(
  request: FastifyRequest,
  payload: CreateInviteRequest,
): Promise<CreateInviteResponse> {
  if (!request.user || !request.agencyId) {
    throw unauthorised();
  }

  const token = randomUUID().replace(/-/g, "");
  const supabase = getUserClient(request.user.accessToken);
  const { data, error } = await supabase
    .from("agency_invites")
    .insert({
      agency_id: request.agencyId,
      branch_id: payload.branch_id ?? null,
      email: payload.email,
      full_name: payload.full_name ?? null,
      role: payload.role,
      token,
      invited_by: request.user.id,
    })
    .select("*")
    .single<Invite>();

  if (error) {
    if (error.code === "23505") {
      throw badRequest("An invite for that address is already pending.");
    }
    if (error.code === "42501") {
      // RLS rejected — caller is not an admin.
      throw forbidden();
    }
    request.log.error({ err: error }, "create_invite failed");
    throw new AppError({
      status: 500,
      code: "create_invite_failed",
      message: "Could not create invite.",
    });
  }

  const env = loadEnv();
  return {
    invite: data,
    invite_url: `${env.APP_BASE_URL}/accept-invite?token=${token}`,
  };
}

/**
 * Lists pending (unaccepted, unexpired) invites for the caller's agency.
 */
export async function listInvites(request: FastifyRequest): Promise<Invite[]> {
  if (!request.user || !request.agencyId) {
    throw unauthorised();
  }
  const supabase = getUserClient(request.user.accessToken);
  const { data, error } = await supabase
    .from("agency_invites")
    .select("*")
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) {
    request.log.error({ err: error }, "list_invites failed");
    throw new AppError({
      status: 500,
      code: "list_invites_failed",
      message: "Could not list invites.",
    });
  }
  return (data ?? []) as Invite[];
}

/**
 * Consumes an invite token after the invited user has signed up via Supabase
 * Auth. The RPC verifies the auth email matches the invite email.
 */
export async function consumeInvite(
  request: FastifyRequest,
  payload: AcceptInviteRequest,
): Promise<AcceptInviteResponse> {
  if (!request.user) {
    throw unauthorised();
  }
  const supabase = getUserClient(request.user.accessToken);
  const { data, error } = await supabase
    .rpc("consume_agency_invite", {
      p_token: payload.token,
      p_full_name: payload.full_name,
    })
    .single<{ user_id: string; agency_id: string }>();

  if (error) {
    const msg = error.message;
    if (msg.includes("invite_not_found")) {
      throw new AppError({ status: 404, code: "invite_not_found", message: "Invite not found." });
    }
    if (msg.includes("invite_already_used")) {
      throw new AppError({
        status: 409,
        code: "invite_already_used",
        message: "That invite has already been used.",
      });
    }
    if (msg.includes("invite_expired")) {
      throw new AppError({
        status: 410,
        code: "invite_expired",
        message: "That invite has expired.",
      });
    }
    if (msg.includes("invite_email_mismatch")) {
      throw new AppError({
        status: 400,
        code: "invite_email_mismatch",
        message: "Sign in with the email address the invite was sent to.",
      });
    }
    if (msg.includes("already belongs to an agency")) {
      throw new AppError({
        status: 409,
        code: "already_bootstrapped",
        message: "This account is already linked to an agency.",
      });
    }
    request.log.error({ err: error }, "consume_invite failed");
    throw new AppError({
      status: 500,
      code: "consume_invite_failed",
      message: "Could not accept invite.",
    });
  }

  return { user_id: data.user_id, agency_id: data.agency_id };
}

// Re-export for the auth route to call once the bootstrap RPC has succeeded.
// The real implementation lives in services/billing.ts.
export { startTrialSubscription } from "./billing.js";

import { randomUUID } from "node:crypto";
import type { FastifyRequest } from "fastify";
import type {
  Agency,
  AgencyLogoUploadRequest,
  AgencyLogoUploadResponse,
  UpdateAgencyRequest,
} from "@app/shared/schemas";
import { AppError, notFound, unauthorised } from "../errors.js";
import { createSignedPutUrl, publicUrl, sanitiseFilename } from "../integrations/r2.js";
import { getUserClient } from "../integrations/supabase.js";

export async function getMyAgency(request: FastifyRequest): Promise<Agency> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const supabase = getUserClient(request.user.accessToken);
  const { data, error } = await supabase
    .from("agencies")
    .select("*")
    .eq("id", request.agencyId)
    .maybeSingle<Agency>();
  if (error) {
    throw new AppError({
      status: 500,
      code: "get_agency_failed",
      message: "Could not load agency.",
    });
  }
  if (!data) throw notFound("Agency");
  return data;
}

export async function updateMyAgency(
  request: FastifyRequest,
  payload: UpdateAgencyRequest,
): Promise<Agency> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const supabase = getUserClient(request.user.accessToken);
  const { data, error } = await supabase
    .from("agencies")
    .update(payload)
    .eq("id", request.agencyId)
    .select("*")
    .maybeSingle<Agency>();
  if (error) {
    if (error.code === "42501") {
      // RLS: only admins may update the agency row.
      throw new AppError({
        status: 403,
        code: "admin_only",
        message: "Only an admin can change agency settings.",
      });
    }
    throw new AppError({
      status: 500,
      code: "update_agency_failed",
      message: "Could not update agency.",
    });
  }
  if (!data) throw notFound("Agency");
  return data;
}

/**
 * Returns a presigned PUT for the new logo and patches agencies.logo_url so
 * the browser doesn't have to do a second round-trip after upload. If the
 * subsequent PUT fails, the logo_url will 404 until they retry — same
 * approach as photo upload.
 */
export async function createLogoUpload(
  request: FastifyRequest,
  payload: AgencyLogoUploadRequest,
): Promise<AgencyLogoUploadResponse> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const supabase = getUserClient(request.user.accessToken);

  const key = `agencies/${request.agencyId}/branding/logo-${randomUUID()}-${sanitiseFilename(
    payload.filename,
  )}`;
  const logoUrl = publicUrl(key);

  const { error } = await supabase
    .from("agencies")
    .update({ logo_url: logoUrl })
    .eq("id", request.agencyId);
  if (error) {
    if (error.code === "42501") {
      throw new AppError({
        status: 403,
        code: "admin_only",
        message: "Only an admin can change agency branding.",
      });
    }
    throw new AppError({
      status: 500,
      code: "logo_update_failed",
      message: "Could not record logo URL.",
    });
  }

  const uploadUrl = await createSignedPutUrl({
    key,
    contentType: payload.content_type,
    expiresInSeconds: 300,
  });
  return { upload_url: uploadUrl, logo_url: logoUrl };
}

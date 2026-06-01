import type { FastifyRequest } from "fastify";
import type {
  PhotoStagedCallback,
  StagePhotoRequest,
  StagePhotoResponse,
  StagingVariation,
} from "@app/shared/schemas";
import { AppError, badRequest, notFound, unauthorised } from "../errors.js";
import { stagingGenerateQueue } from "../queues/staging-generate.js";
import { getServiceClient, getUserClient } from "../integrations/supabase.js";
import { assertWithinQuota } from "./quota.js";
import { recordUsageEvent } from "./usage.js";

export async function enqueueStaging(
  request: FastifyRequest,
  photoId: string,
  payload: StagePhotoRequest,
): Promise<StagePhotoResponse> {
  if (!request.user || !request.agencyId) throw unauthorised();

  await assertWithinQuota({
    agencyId: request.agencyId,
    eventType: "staging_generated",
    units: payload.variations,
  });

  const supabase = getUserClient(request.user.accessToken);
  const { data: photo, error } = await supabase
    .from("property_photos")
    .select("id, property_id")
    .eq("id", photoId)
    .maybeSingle<{ id: string; property_id: string }>();
  if (error) {
    throw new AppError({
      status: 500,
      code: "lookup_photo_failed",
      message: "Could not load photo.",
    });
  }
  if (!photo) throw notFound("Photo");

  const jobId = `staging-generate:${photoId}:${Date.now()}`;
  await stagingGenerateQueue().add(
    "stage",
    {
      photo_id: photoId,
      property_id: photo.property_id,
      agency_id: request.agencyId,
      style: payload.style,
      variations: payload.variations,
    },
    { jobId, removeOnComplete: 500, removeOnFail: 200 },
  );

  return { photo_id: photoId, job_id: jobId, status: "queued" };
}

/**
 * Persists the orchestrator's variation URLs onto the photo. Replaces any
 * previous, non-selected variations — the user has just regenerated, so the
 * old ones are no longer relevant. A selected variation (already saved as
 * staged_url) is left alone on the photo row; only the variations array is
 * overwritten.
 *
 * Service-role: same rationale as the enhance callback.
 */
export async function applyStagingCallback(payload: PhotoStagedCallback): Promise<void> {
  if (payload.status === "failed") {
    console.warn("photo staging failed", payload);
    return;
  }
  const supabase = getServiceClient();

  const { data: existing, error: lookupError } = await supabase
    .from("property_photos")
    .select("property_id")
    .eq("id", payload.photo_id)
    .maybeSingle<{ property_id: string }>();
  if (lookupError || !existing) {
    throw new AppError({
      status: 404,
      code: "photo_not_found",
      message: "Photo for staging callback not found.",
    });
  }

  const variations: StagingVariation[] = payload.variations.map((v) => ({
    id: v.id,
    style: payload.style,
    url: v.url,
    sort_order: v.sort_order,
    selected: false,
  }));

  const { error: updateError } = await supabase
    .from("property_photos")
    .update({ staging_variations: variations })
    .eq("id", payload.photo_id);
  if (updateError) {
    throw new AppError({
      status: 500,
      code: "staging_update_failed",
      message: "Could not save staging variations.",
    });
  }

  await recordUsageEvent({
    agencyId: payload.agency_id,
    propertyId: existing.property_id,
    eventType: "staging_generated",
    unitsConsumed: variations.length,
    billable: true,
  });
}

export async function selectStagingVariation(
  request: FastifyRequest,
  photoId: string,
  variationId: string,
): Promise<{ photo_id: string; selected_variation_id: string; staged_url: string }> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const supabase = getUserClient(request.user.accessToken);

  const { data: photo, error } = await supabase
    .from("property_photos")
    .select("staging_variations")
    .eq("id", photoId)
    .maybeSingle<{ staging_variations: StagingVariation[] | null }>();
  if (error) {
    throw new AppError({
      status: 500,
      code: "lookup_photo_failed",
      message: "Could not load photo.",
    });
  }
  if (!photo) throw notFound("Photo");

  const variations = photo.staging_variations ?? [];
  const chosen = variations.find((v) => v.id === variationId);
  if (!chosen) throw badRequest("That variation does not exist on this photo.");

  const updatedVariations = variations.map((v) => ({ ...v, selected: v.id === variationId }));
  const { error: updateError } = await supabase
    .from("property_photos")
    .update({
      staging_variations: updatedVariations,
      staged_url: chosen.url,
      staging_style: chosen.style,
    })
    .eq("id", photoId);
  if (updateError) {
    throw new AppError({
      status: 500,
      code: "staging_select_failed",
      message: "Could not select staging variation.",
    });
  }

  return { photo_id: photoId, selected_variation_id: variationId, staged_url: chosen.url };
}

export async function clearStagingVariations(
  request: FastifyRequest,
  photoId: string,
): Promise<void> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const supabase = getUserClient(request.user.accessToken);
  const { error } = await supabase
    .from("property_photos")
    .update({ staging_variations: [], staged_url: null, staging_style: null })
    .eq("id", photoId);
  if (error) {
    throw new AppError({
      status: 500,
      code: "staging_clear_failed",
      message: "Could not clear staging variations.",
    });
  }
}

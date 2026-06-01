import type { FastifyRequest } from "fastify";
import type {
  EnhancePhotoRequest,
  EnhancePhotoResponse,
  PhotoEnhancedCallback,
} from "@app/shared/schemas";
import { AppError, notFound, unauthorised } from "../errors.js";
import { photoEnhanceQueue } from "../queues/photo-enhance.js";
import { getServiceClient, getUserClient } from "../integrations/supabase.js";
import { assertWithinQuota } from "./quota.js";
import { recordUsageEvent } from "./usage.js";

/**
 * Enqueues a photo-enhance job. Returns a stable job id so retries on the
 * same photo don't duplicate work.
 */
export async function enqueuePhotoEnhance(
  request: FastifyRequest,
  photoId: string,
  payload: EnhancePhotoRequest,
): Promise<EnhancePhotoResponse> {
  if (!request.user || !request.agencyId) throw unauthorised();

  await assertWithinQuota({
    agencyId: request.agencyId,
    eventType: "photo_enhanced",
    units: payload.enhancements.length,
  });

  const supabase = getUserClient(request.user.accessToken);

  // Confirm the photo exists in this agency. RLS will hide foreign photos.
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

  const jobId = `photo-enhance:${photoId}:${Date.now()}`;
  await photoEnhanceQueue().add(
    "enhance",
    {
      photo_id: photoId,
      property_id: photo.property_id,
      agency_id: request.agencyId,
      enhancements: payload.enhancements,
    },
    { jobId, removeOnComplete: 500, removeOnFail: 200 },
  );

  return { photo_id: photoId, job_id: jobId, status: "queued" };
}

/**
 * Applies an orchestrator callback to the photo row. Idempotent: if the row
 * already has the enhancements applied, this is a no-op (the callback may be
 * delivered twice). Writes one usage_event per enhancement.
 *
 * Why service-role: the orchestrator is server-to-server and not acting on
 * behalf of a Supabase-authed user; the JWT-scoped client wouldn't satisfy
 * RLS for property_photos here.
 */
export async function applyEnhanceCallback(payload: PhotoEnhancedCallback): Promise<void> {
  const supabase = getServiceClient();

  if (payload.status === "failed") {
    // Surface failure in logs but don't persist anything on the row — the UI
    // re-polls and the user can re-trigger. Future work: a status column.
    console.warn("photo enhance failed", payload);
    return;
  }

  const { data: existing, error: lookupError } = await supabase
    .from("property_photos")
    .select("enhancements_applied, property_id")
    .eq("id", payload.photo_id)
    .maybeSingle<{ enhancements_applied: string[] | null; property_id: string }>();
  if (lookupError || !existing) {
    throw new AppError({
      status: 404,
      code: "photo_not_found",
      message: "Photo for callback not found.",
    });
  }

  const previous = new Set(existing.enhancements_applied ?? []);
  const incoming = payload.enhancements_applied;
  const newOnes = incoming.filter((e) => !previous.has(e));
  const merged = Array.from(new Set([...previous, ...incoming]));

  const patch: Record<string, unknown> = {
    enhancements_applied: merged,
  };
  if (payload.enhanced_url) patch.enhanced_url = payload.enhanced_url;
  if (payload.dusk_url) patch.dusk_url = payload.dusk_url;

  const { error: updateError } = await supabase
    .from("property_photos")
    .update(patch)
    .eq("id", payload.photo_id);
  if (updateError) {
    throw new AppError({
      status: 500,
      code: "photo_update_failed",
      message: "Could not update photo.",
    });
  }

  // One ledger row per newly-applied enhancement. Re-deliveries don't double-bill.
  await Promise.all(
    newOnes.map(() =>
      recordUsageEvent({
        agencyId: payload.agency_id,
        propertyId: existing.property_id,
        eventType: "photo_enhanced",
        billable: true,
      }),
    ),
  );
}

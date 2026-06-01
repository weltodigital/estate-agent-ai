import { randomUUID } from "node:crypto";
import type { FastifyRequest } from "fastify";
import type {
  Photo,
  UpdatePhotoRequest,
  UploadPhotoSignedRequest,
  UploadPhotoSignedResponse,
} from "@app/shared/schemas";
import { AppError, badRequest, notFound, unauthorised } from "../errors.js";
import { buildPhotoKey, createSignedPutUrl, deleteObject, publicUrl } from "../integrations/r2.js";
import { getServiceClient, getUserClient } from "../integrations/supabase.js";

export async function listPropertyPhotos(
  request: FastifyRequest,
  propertyId: string,
): Promise<Photo[]> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const supabase = getUserClient(request.user.accessToken);
  const { data, error } = await supabase
    .from("property_photos")
    .select("*")
    .eq("property_id", propertyId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    request.log.error({ err: error, propertyId }, "list_photos failed");
    throw new AppError({
      status: 500,
      code: "list_photos_failed",
      message: "Could not load photos.",
    });
  }
  return (data ?? []) as Photo[];
}

/**
 * Creates a placeholder property_photos row with the final R2 URL baked in,
 * and returns a presigned PUT URL the browser can upload to directly. After
 * the browser PUT succeeds, the row is already correct — no confirm step.
 *
 * If the PUT fails, the row is orphaned (URL 404s). A future janitor job can
 * sweep these.
 */
export async function createPhotoUpload(
  request: FastifyRequest,
  propertyId: string,
  payload: UploadPhotoSignedRequest,
): Promise<UploadPhotoSignedResponse> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const supabase = getUserClient(request.user.accessToken);

  // Verify the property belongs to this agency (RLS would let an empty
  // SELECT through, so we look explicitly).
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .maybeSingle();
  if (propertyError) {
    throw new AppError({
      status: 500,
      code: "lookup_property_failed",
      message: "Could not load property.",
    });
  }
  if (!property) throw notFound("Property");

  const photoId = randomUUID();
  const key = buildPhotoKey({
    agencyId: request.agencyId,
    propertyId,
    photoId,
    filename: payload.filename,
  });

  // Place the new photo at the end of the existing sort order.
  const { data: existing } = await supabase
    .from("property_photos")
    .select("sort_order")
    .eq("property_id", propertyId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextSortOrder = ((existing?.[0]?.sort_order as number | undefined) ?? -1) + 1;

  const { data: photo, error: insertError } = await supabase
    .from("property_photos")
    .insert({
      id: photoId,
      property_id: propertyId,
      original_url: publicUrl(key),
      room_type: payload.room_type ?? "other",
      sort_order: nextSortOrder,
      is_primary: false,
    })
    .select("*")
    .single<Photo>();
  if (insertError) {
    request.log.error({ err: insertError }, "create_photo failed");
    throw new AppError({
      status: 500,
      code: "create_photo_failed",
      message: "Could not create photo.",
    });
  }

  const uploadUrl = await createSignedPutUrl({
    key,
    contentType: payload.content_type,
    expiresInSeconds: 300,
  });

  return { photo, upload_url: uploadUrl };
}

export async function updatePhoto(
  request: FastifyRequest,
  id: string,
  payload: UpdatePhotoRequest,
): Promise<Photo> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const supabase = getUserClient(request.user.accessToken);

  // If setting primary, unset any existing primary first. Two statements, not
  // a transaction — we accept a tiny window where neither row is primary, which
  // the UI doesn't notice. The DB's partial unique index on (property_id) where
  // is_primary protects against a double-primary outcome.
  if (payload.is_primary === true) {
    const { data: existing, error: lookupError } = await supabase
      .from("property_photos")
      .select("property_id")
      .eq("id", id)
      .maybeSingle();
    if (lookupError) {
      throw new AppError({
        status: 500,
        code: "update_photo_failed",
        message: "Could not look up photo.",
      });
    }
    if (!existing) throw notFound("Photo");

    const { error: clearError } = await supabase
      .from("property_photos")
      .update({ is_primary: false })
      .eq("property_id", existing.property_id)
      .neq("id", id);
    if (clearError) {
      throw new AppError({
        status: 500,
        code: "update_photo_failed",
        message: "Could not unset existing primary photo.",
      });
    }
  }

  const { data, error } = await supabase
    .from("property_photos")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle<Photo>();
  if (error) {
    if (error.code === "23505") {
      throw badRequest("Another photo is already the primary.");
    }
    request.log.error({ err: error, id }, "update_photo failed");
    throw new AppError({
      status: 500,
      code: "update_photo_failed",
      message: "Could not update photo.",
    });
  }
  if (!data) throw notFound("Photo");
  return data;
}

export async function reorderPhotos(
  request: FastifyRequest,
  propertyId: string,
  photoIds: string[],
): Promise<Photo[]> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const supabase = getUserClient(request.user.accessToken);

  // Verify every id belongs to this property and we have them all.
  const { data: existing, error: existingError } = await supabase
    .from("property_photos")
    .select("id")
    .eq("property_id", propertyId);
  if (existingError) {
    throw new AppError({
      status: 500,
      code: "reorder_photos_failed",
      message: "Could not load photos.",
    });
  }
  const existingIds = new Set((existing ?? []).map((row) => row.id as string));
  const requestedSet = new Set(photoIds);
  if (existingIds.size !== requestedSet.size) {
    throw badRequest("Reorder list must include every photo exactly once.");
  }
  for (const id of photoIds) {
    if (!existingIds.has(id)) {
      throw badRequest("Reorder list contains a photo that doesn't belong to this property.");
    }
  }

  // Issue one update per row. Acceptable for typical agency-listing photo
  // counts (under 30). Future: a single SQL CASE-when statement.
  await Promise.all(
    photoIds.map((id, index) =>
      supabase.from("property_photos").update({ sort_order: index }).eq("id", id),
    ),
  );

  return listPropertyPhotos(request, propertyId);
}

export async function deletePhoto(request: FastifyRequest, id: string): Promise<void> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const supabase = getUserClient(request.user.accessToken);

  const { data: photo, error: lookupError } = await supabase
    .from("property_photos")
    .select("id, original_url")
    .eq("id", id)
    .maybeSingle();
  if (lookupError) {
    throw new AppError({
      status: 500,
      code: "delete_photo_failed",
      message: "Could not load photo.",
    });
  }
  if (!photo) throw notFound("Photo");

  const { error } = await supabase.from("property_photos").delete().eq("id", id);
  if (error) {
    throw new AppError({
      status: 500,
      code: "delete_photo_failed",
      message: "Could not delete photo.",
    });
  }

  // Best-effort R2 cleanup. We swallow errors so the DB row is gone either way.
  const url = photo.original_url as string;
  const r2Key = keyFromPublicUrl(url);
  if (r2Key) {
    try {
      await deleteObject(r2Key);
    } catch (err) {
      request.log.warn({ err, r2Key }, "r2 deleteObject failed");
    }
  }

  // The DB row is gone; nothing else to do here.
  void getServiceClient;
}

function keyFromPublicUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\//, "");
  } catch {
    return null;
  }
}

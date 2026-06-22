import { z } from "zod";
import { PHOTO_CATEGORIES, ROOM_TYPES, STAGING_STYLES } from "../constants";

export const stagingVariationSchema = z.object({
  id: z.string().uuid(),
  style: z.enum(STAGING_STYLES),
  url: z.string().url(),
  sort_order: z.number().int().min(0),
  selected: z.boolean().default(false),
});
export type StagingVariation = z.infer<typeof stagingVariationSchema>;

export const photoSchema = z.object({
  id: z.string().uuid(),
  property_id: z.string().uuid(),
  original_url: z.string().url(),
  enhanced_url: z.string().url().nullable(),
  staged_url: z.string().url().nullable(),
  dusk_url: z.string().url().nullable(),
  room_type: z.enum(ROOM_TYPES),
  sort_order: z.number().int().min(0),
  enhancements_applied: z.array(z.string()),
  staging_style: z.enum(STAGING_STYLES).nullable(),
  staging_variations: z.array(stagingVariationSchema).default([]),
  suggested_style: z.enum(STAGING_STYLES).nullable(),
  is_primary: z.boolean(),
  // Optional (not just required) so reads survive the gap before the category
  // column migration is applied.
  category: z.enum(PHOTO_CATEGORIES).optional(),
  created_at: z.string().datetime({ offset: true }),
});
export type Photo = z.infer<typeof photoSchema>;

export const uploadPhotoSignedRequestSchema = z.object({
  filename: z.string().min(1).max(200),
  content_type: z.string().regex(/^image\//),
  room_type: z.enum(ROOM_TYPES).optional(),
  // Which workflow tab the photo was uploaded under.
  category: z.enum(PHOTO_CATEGORIES).optional(),
});
export type UploadPhotoSignedRequest = z.infer<typeof uploadPhotoSignedRequestSchema>;

export const photosListQuerySchema = z.object({
  category: z.enum(PHOTO_CATEGORIES).optional(),
});
export type PhotosListQuery = z.infer<typeof photosListQuerySchema>;

export const uploadPhotoSignedResponseSchema = z.object({
  photo: photoSchema,
  upload_url: z.string().url(),
});
export type UploadPhotoSignedResponse = z.infer<typeof uploadPhotoSignedResponseSchema>;

export const reorderPhotosRequestSchema = z.object({
  photo_ids: z.array(z.string().uuid()).min(1).max(100),
});
export type ReorderPhotosRequest = z.infer<typeof reorderPhotosRequestSchema>;

export const photosListResponseSchema = z.object({
  items: z.array(photoSchema),
});
export type PhotosListResponse = z.infer<typeof photosListResponseSchema>;

export const updatePhotoSchema = z
  .object({
    sort_order: z.number().int().min(0),
    is_primary: z.boolean(),
    room_type: z.enum(ROOM_TYPES),
  })
  .partial();
export type UpdatePhotoRequest = z.infer<typeof updatePhotoSchema>;

export const PHOTO_ENHANCEMENTS = [
  "sky_replacement",
  "object_removal",
  "gdpr_blur",
  "exposure_correction",
  "colour_temperature",
  "colour_saturation",
  "shadow_boost",
  "hd_upscale",
  "hd_sharpen",
  "logo_watermark",
  "dusk_shot",
] as const;
export type PhotoEnhancement = (typeof PHOTO_ENHANCEMENTS)[number];

// Safe "cleanup" enhancements: auto-applied on upload (conditionally, never
// making a photo worse), free, and reversible. The orchestrator decides per
// image whether each actually applies.
export const photoDownloadQuerySchema = z.object({
  variant: z.enum(["enhanced", "staged", "original"]).default("enhanced"),
});
export type PhotoDownloadQuery = z.infer<typeof photoDownloadQuerySchema>;

export const photoDownloadResponseSchema = z.object({ url: z.string().url() });
export type PhotoDownloadResponse = z.infer<typeof photoDownloadResponseSchema>;

export const AUTO_ENHANCEMENTS = [
  "gdpr_blur",
  "exposure_correction",
  "colour_temperature",
  "colour_saturation",
  "shadow_boost",
  "hd_upscale",
] as const satisfies readonly PhotoEnhancement[];

// Creative enhancements: explicit, per-photo/per-property decisions — these are
// the billable ones and the only options shown in the "Add creative
// enhancements" dialog (object removal stays its own per-photo mask action).
export const CREATIVE_ENHANCEMENTS = [
  "sky_replacement",
  "hd_sharpen",
  "object_removal",
  "dusk_shot",
  "logo_watermark",
] as const satisfies readonly PhotoEnhancement[];

export function isCreativeEnhancement(e: PhotoEnhancement): boolean {
  return (CREATIVE_ENHANCEMENTS as readonly PhotoEnhancement[]).includes(e);
}

export const enhancePhotoRequestSchema = z
  .object({
    enhancements: z.array(z.enum(PHOTO_ENHANCEMENTS)).min(1),
    // Object removal needs a mask (white = remove) uploaded via the
    // mask-upload endpoint. Required whenever object_removal is requested.
    mask_url: z.string().url().optional(),
  })
  .refine((value) => !value.enhancements.includes("object_removal") || Boolean(value.mask_url), {
    message: "object_removal requires a mask_url",
    path: ["mask_url"],
  });
export type EnhancePhotoRequest = z.infer<typeof enhancePhotoRequestSchema>;

export const maskUploadRequestSchema = z.object({
  content_type: z.string().regex(/^image\//),
});
export type MaskUploadRequest = z.infer<typeof maskUploadRequestSchema>;

export const maskUploadResponseSchema = z.object({
  upload_url: z.string().url(),
  mask_url: z.string().url(),
});
export type MaskUploadResponse = z.infer<typeof maskUploadResponseSchema>;

export const enhancePhotoResponseSchema = z.object({
  photo_id: z.string().uuid(),
  job_id: z.string(),
  status: z.literal("queued"),
});
export type EnhancePhotoResponse = z.infer<typeof enhancePhotoResponseSchema>;

/**
 * The orchestrator POSTs this payload back to the API once an enhancement
 * job finishes. The body is signed with HMAC-SHA256(AI_CALLBACK_SECRET) and
 * sent in the X-Orchestrator-Signature header (sha256=<hex>).
 */
export const photoEnhancedCallbackSchema = z.object({
  photo_id: z.string().uuid(),
  agency_id: z.string().uuid(),
  enhancements_applied: z.array(z.enum(PHOTO_ENHANCEMENTS)),
  enhanced_url: z.string().url().nullable(),
  dusk_url: z.string().url().nullable(),
  status: z.enum(["complete", "failed"]),
  error: z.string().nullable().optional(),
});
export type PhotoEnhancedCallback = z.infer<typeof photoEnhancedCallbackSchema>;

export const stagePhotoRequestSchema = z.object({
  style: z.enum(STAGING_STYLES),
  // Drives room-appropriate furnishing (a bedroom is staged unlike a living
  // room). Defaults to the photo's detected room_type on the client.
  room_type: z.enum(ROOM_TYPES).optional(),
  variations: z.number().int().min(1).max(4).default(3),
});
export type StagePhotoRequest = z.infer<typeof stagePhotoRequestSchema>;

export const stagePhotoResponseSchema = z.object({
  photo_id: z.string().uuid(),
  job_id: z.string(),
  status: z.literal("queued"),
});
export type StagePhotoResponse = z.infer<typeof stagePhotoResponseSchema>;

/**
 * Orchestrator -> API callback for completed staging jobs. Same HMAC scheme
 * as photo enhancement.
 */
export const photoStagedCallbackSchema = z.object({
  photo_id: z.string().uuid(),
  agency_id: z.string().uuid(),
  style: z.enum(STAGING_STYLES),
  variations: z
    .array(
      z.object({
        id: z.string().uuid(),
        url: z.string().url(),
        sort_order: z.number().int().min(0),
      }),
    )
    .max(8),
  status: z.enum(["complete", "failed"]),
  error: z.string().nullable().optional(),
});
export type PhotoStagedCallback = z.infer<typeof photoStagedCallbackSchema>;

export const selectStagingVariationSchema = z.object({
  variation_id: z.string().uuid(),
});
export type SelectStagingVariationRequest = z.infer<typeof selectStagingVariationSchema>;

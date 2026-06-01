import { z } from "zod";
import { ROOM_TYPES, STAGING_STYLES } from "../constants";

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
  is_primary: z.boolean(),
  created_at: z.string().datetime(),
});
export type Photo = z.infer<typeof photoSchema>;

export const uploadPhotoSignedRequestSchema = z.object({
  filename: z.string().min(1).max(200),
  content_type: z.string().regex(/^image\//),
  room_type: z.enum(ROOM_TYPES).optional(),
});
export type UploadPhotoSignedRequest = z.infer<typeof uploadPhotoSignedRequestSchema>;

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
  "dusk_shot",
] as const;
export type PhotoEnhancement = (typeof PHOTO_ENHANCEMENTS)[number];

export const enhancePhotoRequestSchema = z.object({
  enhancements: z.array(z.enum(PHOTO_ENHANCEMENTS)).min(1),
});
export type EnhancePhotoRequest = z.infer<typeof enhancePhotoRequestSchema>;

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
  variations: z.number().int().min(1).max(4).default(3),
});
export type StagePhotoRequest = z.infer<typeof stagePhotoRequestSchema>;

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

export const enhancePhotoRequestSchema = z.object({
  enhancements: z
    .array(
      z.enum([
        "sky_replacement",
        "object_removal",
        "gdpr_blur",
        "exposure_correction",
        "dusk_shot",
      ]),
    )
    .min(1),
});
export type EnhancePhotoRequest = z.infer<typeof enhancePhotoRequestSchema>;

export const stagePhotoRequestSchema = z.object({
  style: z.enum(STAGING_STYLES),
  variations: z.number().int().min(1).max(4).default(3),
});
export type StagePhotoRequest = z.infer<typeof stagePhotoRequestSchema>;

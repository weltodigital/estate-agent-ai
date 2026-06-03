import { z } from "zod";
import { VIDEO_FORMATS, VIDEO_STATUSES, VIDEO_TEMPLATES } from "../constants";

export const videoCampaignSchema = z.object({
  id: z.string().uuid(),
  property_id: z.string().uuid(),
  template: z.enum(VIDEO_TEMPLATES),
  photo_ids: z.array(z.string().uuid()).min(1),
  format: z.enum(VIDEO_FORMATS),
  video_url: z.string().url().nullable(),
  status: z.enum(VIDEO_STATUSES),
  created_at: z.string().datetime({ offset: true }),
});
export type VideoCampaign = z.infer<typeof videoCampaignSchema>;

export const createVideoCampaignRequestSchema = z.object({
  template: z.enum(VIDEO_TEMPLATES),
  format: z.enum(VIDEO_FORMATS),
  photo_ids: z.array(z.string().uuid()).min(1).max(40),
});
export type CreateVideoCampaignRequest = z.infer<typeof createVideoCampaignRequestSchema>;

import { Queue } from "bullmq";
import { z } from "zod";
import { VIDEO_FORMATS, VIDEO_TEMPLATES } from "@app/shared/constants";
import { getRedisConnection } from "./connection.js";

export const videoRenderJobSchema = z.object({
  video_campaign_id: z.string().uuid(),
  property_id: z.string().uuid(),
  agency_id: z.string().uuid(),
  template: z.enum(VIDEO_TEMPLATES),
  format: z.enum(VIDEO_FORMATS),
  photo_ids: z.array(z.string().uuid()).min(1),
});
export type VideoRenderJob = z.infer<typeof videoRenderJobSchema>;

let queue: Queue<VideoRenderJob> | undefined;

export function videoRenderQueue(): Queue<VideoRenderJob> {
  if (!queue) {
    queue = new Queue<VideoRenderJob>("video-render", { connection: getRedisConnection() });
  }
  return queue;
}

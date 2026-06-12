import { Queue } from "bullmq";
import { z } from "zod";
import { WATERMARK_POSITIONS } from "@app/shared/constants";
import { PHOTO_ENHANCEMENTS } from "@app/shared/schemas";
import { getRedisConnection } from "./connection.js";

export const photoEnhanceJobSchema = z.object({
  photo_id: z.string().uuid(),
  property_id: z.string().uuid(),
  agency_id: z.string().uuid(),
  enhancements: z.array(z.enum(PHOTO_ENHANCEMENTS)),
  // Present only for object_removal — the URL of the painted mask in R2.
  mask_url: z.string().url().optional(),
  // Present only for logo_watermark — the agency logo and where to place it.
  logo_url: z.string().url().optional(),
  watermark_position: z.enum(WATERMARK_POSITIONS).optional(),
});
export type PhotoEnhanceJob = z.infer<typeof photoEnhanceJobSchema>;

let queue: Queue<PhotoEnhanceJob> | undefined;

export function photoEnhanceQueue(): Queue<PhotoEnhanceJob> {
  if (!queue) {
    queue = new Queue<PhotoEnhanceJob>("photo-enhance", { connection: getRedisConnection() });
  }
  return queue;
}

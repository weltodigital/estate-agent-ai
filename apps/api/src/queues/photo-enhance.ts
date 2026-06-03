import { Queue } from "bullmq";
import { z } from "zod";
import { getRedisConnection } from "./connection.js";

export const photoEnhanceJobSchema = z.object({
  photo_id: z.string().uuid(),
  property_id: z.string().uuid(),
  agency_id: z.string().uuid(),
  enhancements: z.array(
    z.enum(["sky_replacement", "object_removal", "gdpr_blur", "exposure_correction", "dusk_shot"]),
  ),
  // Present only for object_removal — the URL of the painted mask in R2.
  mask_url: z.string().url().optional(),
});
export type PhotoEnhanceJob = z.infer<typeof photoEnhanceJobSchema>;

let queue: Queue<PhotoEnhanceJob> | undefined;

export function photoEnhanceQueue(): Queue<PhotoEnhanceJob> {
  if (!queue) {
    queue = new Queue<PhotoEnhanceJob>("photo-enhance", { connection: getRedisConnection() });
  }
  return queue;
}

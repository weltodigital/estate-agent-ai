import { Queue } from "bullmq";
import { z } from "zod";
import { ROOM_TYPES, STAGING_STYLES } from "@app/shared/constants";
import { getRedisConnection } from "./connection.js";

export const stagingGenerateJobSchema = z.object({
  photo_id: z.string().uuid(),
  property_id: z.string().uuid(),
  agency_id: z.string().uuid(),
  style: z.enum(STAGING_STYLES),
  room_type: z.enum(ROOM_TYPES).optional(),
  variations: z.number().int().min(1).max(4).default(3),
});
export type StagingGenerateJob = z.infer<typeof stagingGenerateJobSchema>;

let queue: Queue<StagingGenerateJob> | undefined;

export function stagingGenerateQueue(): Queue<StagingGenerateJob> {
  if (!queue) {
    queue = new Queue<StagingGenerateJob>("staging-generate", {
      connection: getRedisConnection(),
    });
  }
  return queue;
}

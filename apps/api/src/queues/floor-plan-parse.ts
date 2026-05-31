import { Queue } from "bullmq";
import { z } from "zod";
import { getRedisConnection } from "./connection.js";

export const floorPlanParseJobSchema = z.object({
  floor_plan_id: z.string().uuid(),
  property_id: z.string().uuid(),
  agency_id: z.string().uuid(),
  sketch_url: z.string().url(),
});
export type FloorPlanParseJob = z.infer<typeof floorPlanParseJobSchema>;

let queue: Queue<FloorPlanParseJob> | undefined;

export function floorPlanParseQueue(): Queue<FloorPlanParseJob> {
  if (!queue) {
    queue = new Queue<FloorPlanParseJob>("floor-plan-parse", {
      connection: getRedisConnection(),
    });
  }
  return queue;
}

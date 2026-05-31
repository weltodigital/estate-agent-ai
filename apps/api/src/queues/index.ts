export * from "./connection.js";
export * from "./photo-enhance.js";
export * from "./staging-generate.js";
export * from "./floor-plan-parse.js";
export * from "./video-render.js";

export const QUEUE_NAMES = {
  photoEnhance: "photo-enhance",
  stagingGenerate: "staging-generate",
  floorPlanParse: "floor-plan-parse",
  videoRender: "video-render",
} as const;
export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

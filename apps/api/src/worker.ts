import { Worker } from "bullmq";
import pino from "pino";
import { loadEnv } from "./env.js";
import { getRedisConnection } from "./queues/connection.js";
import { floorPlanParseJobSchema } from "./queues/floor-plan-parse.js";
import { photoEnhanceJobSchema } from "./queues/photo-enhance.js";
import { stagingGenerateJobSchema } from "./queues/staging-generate.js";
import { videoRenderJobSchema } from "./queues/video-render.js";

const env = loadEnv();
const log = pino({ level: env.LOG_LEVEL });

const connection = getRedisConnection();

new Worker(
  "photo-enhance",
  async (job) => {
    const parsed = photoEnhanceJobSchema.parse(job.data);
    log.info({ jobId: job.id, parsed }, "photo-enhance: stub");
    // TODO(phase-1/5): callOrchestrator("/jobs/photo/enhance", parsed);
  },
  { connection },
);

new Worker(
  "staging-generate",
  async (job) => {
    const parsed = stagingGenerateJobSchema.parse(job.data);
    log.info({ jobId: job.id, parsed }, "staging-generate: stub");
    // TODO(phase-1/6): callOrchestrator("/jobs/staging/generate", parsed);
  },
  { connection },
);

new Worker(
  "floor-plan-parse",
  async (job) => {
    const parsed = floorPlanParseJobSchema.parse(job.data);
    log.info({ jobId: job.id, parsed }, "floor-plan-parse: stub");
    // TODO(phase-1/7): callOrchestrator("/jobs/floor-plan/parse", parsed);
  },
  { connection },
);

new Worker(
  "video-render",
  async (job) => {
    const parsed = videoRenderJobSchema.parse(job.data);
    log.info({ jobId: job.id, parsed }, "video-render: stub");
    // TODO(post-phase-1): callOrchestrator("/jobs/video/render", parsed);
  },
  { connection },
);

log.info("workers started: photo-enhance, staging-generate, floor-plan-parse, video-render");

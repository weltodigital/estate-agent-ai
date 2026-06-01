import { Worker } from "bullmq";
import pino from "pino";
import { loadEnv } from "./env.js";
import { getServiceClient } from "./integrations/supabase.js";
import { getRedisConnection } from "./queues/connection.js";
import { floorPlanParseJobSchema } from "./queues/floor-plan-parse.js";
import { photoEnhanceJobSchema, type PhotoEnhanceJob } from "./queues/photo-enhance.js";
import { stagingGenerateJobSchema } from "./queues/staging-generate.js";
import { videoRenderJobSchema } from "./queues/video-render.js";

const env = loadEnv();
const log = pino({ level: env.LOG_LEVEL });

const connection = getRedisConnection();
const ORCHESTRATOR_BASE = env.AI_ORCHESTRATOR_URL.replace(/\/$/, "");
const CALLBACK_URL = `${env.API_PUBLIC_BASE_URL.replace(/\/$/, "")}/v1/webhooks/orchestrator/photo-enhanced`;

async function fetchPhotoOriginal(photoId: string): Promise<string> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("property_photos")
    .select("original_url")
    .eq("id", photoId)
    .maybeSingle<{ original_url: string }>();
  if (error || !data) {
    throw new Error(`photo ${photoId} not found`);
  }
  return data.original_url;
}

new Worker<PhotoEnhanceJob>(
  "photo-enhance",
  async (job) => {
    const parsed = photoEnhanceJobSchema.parse(job.data);
    const photoUrl = await fetchPhotoOriginal(parsed.photo_id);
    const res = await fetch(`${ORCHESTRATOR_BASE}/jobs/photo/enhance`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        photo_id: parsed.photo_id,
        agency_id: parsed.agency_id,
        property_id: parsed.property_id,
        photo_url: photoUrl,
        enhancements: parsed.enhancements,
        callback_url: CALLBACK_URL,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`orchestrator /jobs/photo/enhance failed: ${res.status} ${detail}`);
    }
    log.info({ jobId: job.id, photoId: parsed.photo_id }, "photo-enhance dispatched");
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

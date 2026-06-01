import { Worker } from "bullmq";
import pino from "pino";
import { loadEnv } from "./env.js";
import { getServiceClient } from "./integrations/supabase.js";
import { getRedisConnection } from "./queues/connection.js";
import { floorPlanParseJobSchema, type FloorPlanParseJob } from "./queues/floor-plan-parse.js";
import { photoEnhanceJobSchema, type PhotoEnhanceJob } from "./queues/photo-enhance.js";
import { stagingGenerateJobSchema, type StagingGenerateJob } from "./queues/staging-generate.js";
import { videoRenderJobSchema } from "./queues/video-render.js";

const env = loadEnv();
const log = pino({ level: env.LOG_LEVEL });

const connection = getRedisConnection();
const ORCHESTRATOR_BASE = env.AI_ORCHESTRATOR_URL.replace(/\/$/, "");
const API_BASE = env.API_PUBLIC_BASE_URL.replace(/\/$/, "");
const ENHANCE_CALLBACK = `${API_BASE}/v1/webhooks/orchestrator/photo-enhanced`;
const STAGE_CALLBACK = `${API_BASE}/v1/webhooks/orchestrator/photo-staged`;
const FLOOR_PLAN_CALLBACK = `${API_BASE}/v1/webhooks/orchestrator/floor-plan-parsed`;

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
        callback_url: ENHANCE_CALLBACK,
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

new Worker<StagingGenerateJob>(
  "staging-generate",
  async (job) => {
    const parsed = stagingGenerateJobSchema.parse(job.data);
    const photoUrl = await fetchPhotoOriginal(parsed.photo_id);
    const res = await fetch(`${ORCHESTRATOR_BASE}/jobs/staging/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        photo_id: parsed.photo_id,
        agency_id: parsed.agency_id,
        photo_url: photoUrl,
        style: parsed.style,
        variations: parsed.variations,
        callback_url: STAGE_CALLBACK,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`orchestrator /jobs/staging/generate failed: ${res.status} ${detail}`);
    }
    log.info({ jobId: job.id, photoId: parsed.photo_id }, "staging-generate dispatched");
  },
  { connection },
);

new Worker<FloorPlanParseJob>(
  "floor-plan-parse",
  async (job) => {
    const parsed = floorPlanParseJobSchema.parse(job.data);
    const res = await fetch(`${ORCHESTRATOR_BASE}/jobs/floor-plan/parse`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        floor_plan_id: parsed.floor_plan_id,
        agency_id: parsed.agency_id,
        sketch_url: parsed.sketch_url,
        callback_url: FLOOR_PLAN_CALLBACK,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`orchestrator /jobs/floor-plan/parse failed: ${res.status} ${detail}`);
    }
    log.info({ jobId: job.id, floorPlanId: parsed.floor_plan_id }, "floor-plan-parse dispatched");
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

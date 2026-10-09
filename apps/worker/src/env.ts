// Worker configuration from env. Keys for engines and Places are optional:
// anything missing is skipped and logged, never faked.

export const env = {
  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  workerId: process.env.WORKER_ID || `worker-${process.pid}`,
  concurrency: Number(process.env.WORKER_CONCURRENCY ?? 4),
  taskConcurrency: Number(process.env.WORKER_TASK_CONCURRENCY ?? 6),
  pollMs: Number(process.env.WORKER_POLL_MS ?? 5000),
  schedulerMs: Number(process.env.WORKER_SCHEDULER_MS ?? 10 * 60 * 1000),
  heartbeatMs: Number(process.env.WORKER_HEARTBEAT_MS ?? 5 * 60 * 1000),
  googlePlacesKey: process.env.GOOGLE_PLACES_API_KEY || "",
  /** USD per Places API call, for cost logging. Check current Google pricing. */
  placesCostPerCall: Number(process.env.PLACES_COST_PER_CALL_USD ?? 0.035),
  /** OpenAI Responses API web search tool type. */
  openaiWebSearchTool: process.env.OPENAI_WEB_SEARCH_TOOL || "web_search",
  crawlMaxPages: Number(process.env.CRAWL_MAX_PAGES ?? 15),
  userAgent: "PrivettBot/1.0 (+https://privett.co.uk/bot)",
};

export function requireDbEnv() {
  if (!env.supabaseUrl || !env.serviceRoleKey) {
    throw new Error("SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
}

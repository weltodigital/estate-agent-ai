// One interface for every engine: runPrompt(engine, prompt) -> EngineAnswer.

import { getEngineConfigs, type EngineAnswer, type EngineId } from "@privett/core";
import { log } from "../log";
import { limiterFor } from "../util/rate-limit";
import { withRetry } from "../util/retry";
import { runAnthropic } from "./anthropic";
import { runGemini } from "./gemini";
import { runOpenAI } from "./openai";
import { runPerplexity } from "./perplexity";
import type { EngineAdapter, PromptContext } from "./types";

export { EngineError } from "./types";
export type { PromptContext } from "./types";

const ADAPTERS: Record<EngineId, EngineAdapter> = {
  openai: runOpenAI,
  perplexity: runPerplexity,
  gemini: runGemini,
  anthropic: runAnthropic,
};

/** Engines with an API key configured. Missing keys are logged once per call site. */
export function availableEngines(requested: string[]): EngineId[] {
  const cfgs = getEngineConfigs();
  const out: EngineId[] = [];
  for (const id of requested) {
    const cfg = cfgs[id as EngineId];
    if (!cfg) {
      log.warn("unknown engine requested", { engine: id });
      continue;
    }
    if (!process.env[cfg.envKey]) {
      log.warn("engine skipped: API key not set", { engine: id, envKey: cfg.envKey });
      continue;
    }
    out.push(cfg.id);
  }
  return out;
}

export async function runPrompt(engine: EngineId, ctx: PromptContext): Promise<EngineAnswer> {
  const cfg = getEngineConfigs()[engine];
  const apiKey = process.env[cfg.envKey];
  if (!apiKey) throw new Error(`${cfg.envKey} is not set`);
  const limiter = limiterFor(engine, cfg.rpm);
  return withRetry(async () => {
    await limiter.acquire();
    return ADAPTERS[engine](cfg, apiKey, ctx);
  });
}

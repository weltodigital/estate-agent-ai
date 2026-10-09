// AI engines we scan, and the models behind them.
//
// Model ids and prices are configuration, not code: every value here can be
// overridden by env var so a provider's model change never needs a deploy of
// new logic. Check each provider's current docs before changing defaults.

export const ENGINE_IDS = ["openai", "perplexity", "gemini", "anthropic"] as const;
export type EngineId = (typeof ENGINE_IDS)[number];

export interface EngineConfig {
  id: EngineId;
  label: string;
  envKey: string; // API key env var
  model: string;
  /** Requests per minute we allow ourselves against this provider. */
  rpm: number;
}

type Env = Record<string, string | undefined>;

function num(env: Env, key: string, fallback: number): number {
  const v = env[key];
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function getEngineConfigs(env: Env = process.env): Record<EngineId, EngineConfig> {
  return {
    openai: {
      id: "openai",
      label: "ChatGPT",
      envKey: "OPENAI_API_KEY",
      model: env.OPENAI_MODEL ?? "gpt-5",
      rpm: num(env, "OPENAI_RPM", 60),
    },
    perplexity: {
      id: "perplexity",
      label: "Perplexity",
      envKey: "PERPLEXITY_API_KEY",
      model: env.PERPLEXITY_MODEL ?? "fast", // Agent API preset (Sonar -> fast)
      rpm: num(env, "PERPLEXITY_RPM", 50),
    },
    gemini: {
      id: "gemini",
      label: "Gemini",
      envKey: "GEMINI_API_KEY",
      model: env.GEMINI_MODEL ?? "gemini-2.5-flash",
      rpm: num(env, "GEMINI_RPM", 60),
    },
    anthropic: {
      id: "anthropic",
      label: "Claude",
      envKey: "ANTHROPIC_API_KEY",
      model: env.ANTHROPIC_ENGINE_MODEL ?? "claude-opus-5-5",
      rpm: num(env, "ANTHROPIC_RPM", 50),
    },
  };
}

export function engineLabel(id: string): string {
  return getEngineConfigs({})[id as EngineId]?.label ?? id;
}

export function isEngineId(v: string): v is EngineId {
  return (ENGINE_IDS as readonly string[]).includes(v);
}

/** Model used to parse answers and generate fix assets. */
export function getParserModel(env: Env = process.env): string {
  return env.ANTHROPIC_PARSER_MODEL ?? "claude-opus-5-5";
}
export function getAssetModel(env: Env = process.env): string {
  return env.ANTHROPIC_ASSET_MODEL ?? "claude-opus-5-5";
}

// ---------------------------------------------------------------------------
// Pricing, for cost logging and per-scan budgets. USD.
// Defaults are best-effort list prices; verify against each provider's pricing
// page and override with MODEL_PRICING_JSON, e.g.
//   {"gpt-5": {"inputPerMTok": 1.25, "outputPerMTok": 10, "perRequest": 0.01}}
// ---------------------------------------------------------------------------

export interface ModelPrice {
  inputPerMTok: number;
  outputPerMTok: number;
  /** Flat fee per request (search/grounding tool calls). */
  perRequest: number;
}

const DEFAULT_PRICING: Record<string, ModelPrice> = {
  "gpt-5": { inputPerMTok: 1.25, outputPerMTok: 10, perRequest: 0.01 },
  sonar: { inputPerMTok: 1, outputPerMTok: 1, perRequest: 0.008 },
  "gemini-2.5-flash": { inputPerMTok: 0.3, outputPerMTok: 2.5, perRequest: 0.035 },
  "claude-opus-5-5": { inputPerMTok: 4, outputPerMTok: 20, perRequest: 0 },
  "claude-sonnet-5-5": { inputPerMTok: 2, outputPerMTok: 10, perRequest: 0 },
  "claude-haiku-5-5": { inputPerMTok: 0.1, outputPerMTok: 0.5, perRequest: 0 },
};

/** Claude web search is billed per search, on top of tokens. */
export const ANTHROPIC_WEB_SEARCH_PER_CALL = 0.01;

/** Fallback so an unknown model is never logged as free. */
const UNKNOWN_MODEL_PRICE: ModelPrice = { inputPerMTok: 5, outputPerMTok: 25, perRequest: 0.02 };

export function getModelPrice(model: string, env: Env = process.env): ModelPrice {
  let overrides: Record<string, ModelPrice> = {};
  if (env.MODEL_PRICING_JSON) {
    try {
      overrides = JSON.parse(env.MODEL_PRICING_JSON) as Record<string, ModelPrice>;
    } catch {
      console.warn("MODEL_PRICING_JSON is not valid JSON; using defaults");
    }
  }
  return overrides[model] ?? DEFAULT_PRICING[model] ?? UNKNOWN_MODEL_PRICE;
}

export function estimateCostUsd(
  model: string,
  usage: { inputTokens?: number; outputTokens?: number; requests?: number; extraUsd?: number },
  env: Env = process.env,
): number {
  const p = getModelPrice(model, env);
  return (
    ((usage.inputTokens ?? 0) / 1_000_000) * p.inputPerMTok +
    ((usage.outputTokens ?? 0) / 1_000_000) * p.outputPerMTok +
    (usage.requests ?? 1) * p.perRequest +
    (usage.extraUsd ?? 0)
  );
}

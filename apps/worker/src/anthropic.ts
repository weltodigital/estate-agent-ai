import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

/** Shared Anthropic client (engine adapter, parser, asset generation). */
export function anthropic(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 3 });
  return client;
}

/**
 * Server-side refusal fallback: if a safety classifier declines, the API
 * reruns the request on Anthropic's recommended fallback model instead of
 * returning a refusal.
 */
export const FALLBACK_BETA = "server-side-fallback-2026-07-01" as const;

// Models that accept `fallbacks: "default"`. Haiku 5.5 has no server-side
// fallback, so sending it there would be rejected.
const FALLBACK_MODELS = new Set(["claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"]);

/** Spread into a beta.messages request: the fallback beta + param where the model supports it. */
export function fallbackParams(model: string): { betas?: [typeof FALLBACK_BETA]; fallbacks?: "default" } {
  return FALLBACK_MODELS.has(model) ? { betas: [FALLBACK_BETA], fallbacks: "default" } : {};
}

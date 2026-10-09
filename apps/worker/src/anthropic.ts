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

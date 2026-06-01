import Anthropic from "@anthropic-ai/sdk";
import { loadEnv } from "../env.js";

let client: Anthropic | undefined;

export class ClaudeNotConfiguredError extends Error {
  constructor() {
    super("Anthropic API key is not configured.");
    this.name = "ClaudeNotConfiguredError";
  }
}

/**
 * Single chokepoint for Anthropic SDK calls. Model strings come from env —
 * see CLAUDE.md "Always read model strings from env. Never hardcode."
 */
export function getClaude(): Anthropic {
  if (!client) {
    const env = loadEnv();
    if (!env.ANTHROPIC_API_KEY) throw new ClaudeNotConfiguredError();
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return client;
}

export function defaultModel(): string {
  return loadEnv().CLAUDE_DEFAULT_MODEL;
}

export function visionModel(): string {
  return loadEnv().CLAUDE_VISION_MODEL;
}

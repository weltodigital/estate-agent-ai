import type { EngineAnswer, EngineConfig } from "@privett/core";

export interface PromptContext {
  /** The question, exactly as a consumer would type it. */
  prompt: string;
  /** Town, used for approximate user location where the API supports it. */
  town: string | null;
}

export type EngineAdapter = (cfg: EngineConfig, apiKey: string, ctx: PromptContext) => Promise<EngineAnswer>;

/** The engine refused or returned nothing usable. Stored as an engine error, never as "not mentioned". */
export class EngineError extends Error {
  constructor(
    message: string,
    readonly raw: unknown = null,
  ) {
    super(message);
  }
}

export function uniqueUrls(urls: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const u of urls) {
    if (!u) continue;
    try {
      const url = new URL(u);
      if (url.protocol === "http:" || url.protocol === "https:") out.add(url.toString());
    } catch {
      // Not a URL; ignore.
    }
  }
  return [...out];
}

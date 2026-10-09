// Perplexity chat completions (search is built in).
// Shape assumed: choices[0].message.content, plus citations: string[] and/or
// search_results: [{url}] at the top level.

import { estimateCostUsd, type EngineAnswer } from "@privett/core";
import { fetchJson } from "../util/retry";
import { EngineError, uniqueUrls, type EngineAdapter } from "./types";

interface PerplexityResponse {
  choices?: { message?: { content?: string } }[];
  citations?: string[];
  search_results?: { url?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export function extractPerplexity(json: PerplexityResponse): { text: string; urls: string[] } {
  const text = (json.choices?.[0]?.message?.content ?? "").trim();
  const urls = uniqueUrls([...(json.citations ?? []), ...(json.search_results ?? []).map((r) => r.url)]);
  return { text, urls };
}

export const runPerplexity: EngineAdapter = async (cfg, apiKey, ctx): Promise<EngineAnswer> => {
  const json = await fetchJson<PerplexityResponse>("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: cfg.model,
      messages: [{ role: "user", content: ctx.prompt }],
      web_search_options: { user_location: { country: "GB", ...(ctx.town ? { city: ctx.town } : {}) } },
    }),
  });
  const { text, urls } = extractPerplexity(json);
  if (!text) throw new EngineError("Perplexity returned no answer text", json);
  const inputTokens = json.usage?.prompt_tokens ?? 0;
  const outputTokens = json.usage?.completion_tokens ?? 0;
  return {
    answerText: text,
    citedUrls: urls,
    raw: json,
    model: cfg.model,
    usage: { inputTokens, outputTokens, searchCalls: 1 },
    costUsd: estimateCostUsd(cfg.model, { inputTokens, outputTokens, requests: 1 }),
  };
};

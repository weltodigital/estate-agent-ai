// Perplexity Agent API (Sonar's replacement; chat completions is retired).
// POST /v1/responses (the server's migration error names it; the docs call
// it /v1/agent, so we fall back to that on 404). Answer text is in the
// `message` output item, sources in the `search_results` item and in
// url_citation annotations. usage.cost.total_cost is Perplexity's own figure,
// so we log real spend instead of an estimate.
//
// PERPLEXITY_MODEL is either a preset ("fast", "low", ...) or a
// provider/model id ("perplexity/sonar"); presets map from the old Sonar
// models: Sonar and Sonar Pro -> fast.

import { estimateCostUsd, type EngineAnswer } from "@privett/core";
import { fetchJson, HttpError } from "../util/retry";
import { EngineError, uniqueUrls, type EngineAdapter } from "./types";

interface PerplexityResponse {
  status?: string;
  model?: string;
  error?: { message?: string };
  output?: {
    type?: string;
    content?: { type?: string; text?: string; annotations?: { type?: string; url?: string }[] }[];
    results?: { url?: string }[];
  }[];
  usage?: { input_tokens?: number; output_tokens?: number; cost?: { total_cost?: number } };
}

const ENDPOINTS = ["https://api.perplexity.ai/v1/responses", "https://api.perplexity.ai/v1/agent"];

export function extractPerplexity(json: PerplexityResponse): { text: string; urls: string[] } {
  const items = json.output ?? [];
  const parts = items.filter((o) => o.type === "message").flatMap((o) => o.content ?? []);
  const text = parts
    .filter((p) => p.type === "output_text")
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  const annotated = parts.flatMap((p) => p.annotations ?? []).map((a) => a.url);
  const searched = items.filter((o) => o.type === "search_results").flatMap((o) => o.results ?? []).map((r) => r.url);
  return { text, urls: uniqueUrls([...annotated, ...searched]) };
}

export const runPerplexity: EngineAdapter = async (cfg, apiKey, ctx): Promise<EngineAnswer> => {
  const isModel = cfg.model.includes("/");
  const body = JSON.stringify({
    ...(isModel ? { model: cfg.model, max_steps: 3 } : { preset: cfg.model }),
    input: ctx.prompt,
    tools: [{ type: "web_search", user_location: { country: "GB", ...(ctx.town ? { city: ctx.town } : {}) } }],
  });

  let json: PerplexityResponse | null = null;
  for (const url of ENDPOINTS) {
    try {
      json = await fetchJson<PerplexityResponse>(url, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body,
      });
      break;
    } catch (err) {
      if (err instanceof HttpError && err.status === 404 && url !== ENDPOINTS[ENDPOINTS.length - 1]) continue;
      throw err;
    }
  }
  if (!json) throw new EngineError("Perplexity returned nothing", null);
  if (json.status && json.status !== "completed") {
    throw new EngineError(`Perplexity response ${json.status}${json.error?.message ? `: ${json.error.message}` : ""}`, json);
  }

  const { text, urls } = extractPerplexity(json);
  if (!text) throw new EngineError("Perplexity returned no answer text", json);
  const inputTokens = json.usage?.input_tokens ?? 0;
  const outputTokens = json.usage?.output_tokens ?? 0;
  const reported = json.usage?.cost?.total_cost;
  return {
    answerText: text,
    citedUrls: urls,
    raw: json,
    model: json.model ?? cfg.model,
    usage: { inputTokens, outputTokens, searchCalls: 1 },
    costUsd:
      typeof reported === "number" && Number.isFinite(reported)
        ? reported
        : estimateCostUsd(cfg.model, { inputTokens, outputTokens, requests: 1 }),
  };
};

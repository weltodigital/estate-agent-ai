// OpenAI Responses API with the hosted web search tool.
// Shape assumed: output[] contains "message" items whose content[] has
// output_text parts with annotations[] of type "url_citation" ({url}).

import { estimateCostUsd, type EngineAnswer } from "@privett/core";
import { env } from "../env";
import { fetchJson } from "../util/retry";
import { EngineError, uniqueUrls, type EngineAdapter } from "./types";

interface OpenAIResponse {
  output?: {
    type: string;
    content?: { type: string; text?: string; annotations?: { type: string; url?: string }[] }[];
  }[];
  output_text?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

export function extractOpenAI(json: OpenAIResponse): { text: string; urls: string[]; searchCalls: number } {
  const parts = (json.output ?? [])
    .filter((o) => o.type === "message")
    .flatMap((o) => o.content ?? [])
    .filter((c) => c.type === "output_text");
  const text = parts.map((p) => p.text ?? "").join("\n").trim() || (json.output_text ?? "").trim();
  const urls = uniqueUrls(parts.flatMap((p) => (p.annotations ?? []).filter((a) => a.type === "url_citation").map((a) => a.url)));
  const searchCalls = (json.output ?? []).filter((o) => o.type === "web_search_call").length;
  return { text, urls, searchCalls };
}

export const runOpenAI: EngineAdapter = async (cfg, apiKey, ctx): Promise<EngineAnswer> => {
  const tool: Record<string, unknown> = { type: env.openaiWebSearchTool };
  tool.user_location = { type: "approximate", country: "GB", ...(ctx.town ? { city: ctx.town } : {}) };
  const json = await fetchJson<OpenAIResponse>("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model: cfg.model, input: ctx.prompt, tools: [tool] }),
  });
  const { text, urls, searchCalls } = extractOpenAI(json);
  if (!text) throw new EngineError("OpenAI returned no answer text", json);
  const inputTokens = json.usage?.input_tokens ?? 0;
  const outputTokens = json.usage?.output_tokens ?? 0;
  return {
    answerText: text,
    citedUrls: urls,
    raw: json,
    model: cfg.model,
    usage: { inputTokens, outputTokens, searchCalls },
    costUsd: estimateCostUsd(cfg.model, { inputTokens, outputTokens, requests: Math.max(1, searchCalls) }),
  };
};

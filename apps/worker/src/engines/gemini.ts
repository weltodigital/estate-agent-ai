// Gemini generateContent with Google Search grounding.
// Shape assumed: candidates[0].content.parts[].text and
// candidates[0].groundingMetadata.groundingChunks[].web.{uri,title}.
// Grounding uris are usually vertexaisearch redirect links whose title is the
// source domain, so we store the domain as the cited URL in that case (the
// redirect itself is kept in raw_json).

import { estimateCostUsd, type EngineAnswer } from "@privett/core";
import { fetchJson } from "../util/retry";
import { EngineError, uniqueUrls, type EngineAdapter } from "./types";

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[]; webSearchQueries?: string[] };
    finishReason?: string;
  }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
}

const REDIRECT_HOST = "vertexaisearch.cloud.google.com";
const DOMAINISH = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

export function extractGemini(json: GeminiResponse): { text: string; urls: string[]; grounded: boolean } {
  const cand = json.candidates?.[0];
  const text = (cand?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  const chunks = cand?.groundingMetadata?.groundingChunks ?? [];
  const urls = uniqueUrls(
    chunks.map((c) => {
      const uri = c.web?.uri;
      const title = c.web?.title?.trim();
      if (uri && !uri.includes(REDIRECT_HOST)) return uri;
      return title && DOMAINISH.test(title) ? `https://${title}/` : null;
    }),
  );
  return { text, urls, grounded: chunks.length > 0 || (cand?.groundingMetadata?.webSearchQueries?.length ?? 0) > 0 };
}

export const runGemini: EngineAdapter = async (cfg, apiKey, ctx): Promise<EngineAnswer> => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`;
  const json = await fetchJson<GeminiResponse>(url, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: ctx.prompt }] }],
      tools: [{ google_search: {} }],
    }),
  });
  const { text, urls, grounded } = extractGemini(json);
  if (!text) throw new EngineError("Gemini returned no answer text", json);
  const inputTokens = json.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = (json.usageMetadata?.candidatesTokenCount ?? 0) + (json.usageMetadata?.thoughtsTokenCount ?? 0);
  return {
    answerText: text,
    citedUrls: urls,
    raw: json,
    model: cfg.model,
    usage: { inputTokens, outputTokens, searchCalls: grounded ? 1 : 0 },
    // Grounding is billed per grounded prompt.
    costUsd: estimateCostUsd(cfg.model, { inputTokens, outputTokens, requests: grounded ? 1 : 0 }),
  };
};

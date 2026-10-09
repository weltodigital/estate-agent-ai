// Claude with the web search server tool. Uses the official SDK.

import type Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_WEB_SEARCH_PER_CALL, estimateCostUsd, type EngineAnswer } from "@privett/core";
import { anthropic, fallbackParams } from "../anthropic";
import { EngineError, uniqueUrls, type EngineAdapter } from "./types";

type BetaMessage = Anthropic.Beta.Messages.BetaMessage;
type BetaContentBlock = Anthropic.Beta.Messages.BetaContentBlock;

export function extractAnthropic(content: BetaContentBlock[]): { text: string; urls: string[] } {
  const text = content
    .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  const urls: (string | undefined)[] = [];
  for (const b of content) {
    if (b.type === "text") {
      for (const c of b.citations ?? []) if (c.type === "web_search_result_location") urls.push(c.url);
    }
  }
  // Prefer what the answer cites; fall back to everything the search returned.
  if (!urls.length) {
    for (const b of content) {
      if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
        for (const r of b.content) if (r.type === "web_search_result") urls.push(r.url);
      }
    }
  }
  return { text, urls: uniqueUrls(urls) };
}

const MAX_CONTINUATIONS = 3;

export const runAnthropic: EngineAdapter = async (cfg, _apiKey, ctx): Promise<EngineAnswer> => {
  const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [{ role: "user", content: ctx.prompt }];
  const responses: BetaMessage[] = [];
  const content: BetaContentBlock[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let searchCalls = 0;

  for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
    const res = await anthropic().beta.messages.create({
      model: cfg.model,
      max_tokens: 16000,
      ...fallbackParams(cfg.model),
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: 3,
          user_location: { type: "approximate", country: "GB", ...(ctx.town ? { city: ctx.town } : {}) },
        },
      ],
      messages,
    });
    responses.push(res);
    content.push(...res.content);
    inputTokens += res.usage.input_tokens;
    outputTokens += res.usage.output_tokens;
    searchCalls += res.usage.server_tool_use?.web_search_requests ?? 0;

    if (res.stop_reason === "refusal") throw new EngineError("Claude declined to answer", responses);
    // A long server-tool turn can pause; send the partial turn back to resume.
    if (res.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: res.content });
  }

  const { text, urls } = extractAnthropic(content);
  if (!text) throw new EngineError("Claude returned no answer text", responses);
  const model = responses.at(-1)?.model ?? cfg.model;
  return {
    answerText: text,
    citedUrls: urls,
    raw: responses,
    model,
    usage: { inputTokens, outputTokens, searchCalls },
    costUsd: estimateCostUsd(model, {
      inputTokens,
      outputTokens,
      requests: 0,
      extraUsd: searchCalls * ANTHROPIC_WEB_SEARCH_PER_CALL,
    }),
  };
};

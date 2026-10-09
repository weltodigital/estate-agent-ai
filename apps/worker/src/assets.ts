// Generates draft fix assets (area pages, FAQs) with the Anthropic API.

import { DRAFT_NOTE, estimateCostUsd, getAssetModel } from "@privett/core";
import { anthropic, fallbackParams } from "./anthropic";
import { CALL_ESTIMATE_USD, type RunBudget } from "./cost";

const SYSTEM = `You write draft website copy for UK estate and letting agents. UK English throughout. Warm, plain and specific; short sentences. Never invent facts, figures, awards, reviews or prices: use a [CHECK: ...] placeholder wherever a specific fact is needed. Never promise search rankings, AI visibility or guaranteed results. Do not use these words: stunning, nestled, boasting, sought-after, seamless, unlock, leverage. Output only the requested content.`;

export async function generateAsset(
  generate: { instructions: string; input: Record<string, unknown> },
  budget: RunBudget,
): Promise<string> {
  budget.check(CALL_ESTIMATE_USD.asset);
  const model = getAssetModel();
  const res = await anthropic().beta.messages.create({
    model,
    max_tokens: 16000,
    ...fallbackParams(model),
    system: SYSTEM,
    output_config: { effort: "medium" },
    messages: [{ role: "user", content: `${generate.instructions}\n\nDetails:\n${JSON.stringify(generate.input, null, 2)}` }],
  });
  await budget.record({
    provider: "anthropic",
    model: res.model ?? model,
    purpose: "asset",
    inputTokens: res.usage.input_tokens,
    outputTokens: res.usage.output_tokens,
    costUsd: estimateCostUsd(res.model ?? model, { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens, requests: 0 }),
  });
  if (res.stop_reason === "refusal") throw new Error("Asset generation was declined");
  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("")
    .trim();
  if (!text) throw new Error("Asset generation returned no text");
  return `> ${DRAFT_NOTE}\n\n${text}`;
}

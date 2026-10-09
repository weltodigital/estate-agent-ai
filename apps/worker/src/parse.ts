// Parse an AI answer into structured data with the Anthropic API.
//
// The SDK's zod helper uses zod v4 schemas, so we mirror core's
// ParsedAnswerSchema here and then re-validate against the core schema.
// If anything fails we return null: the result is stored as parse_status
// 'failed' and excluded from metrics, never guessed.

import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import { estimateCostUsd, getParserModel, normaliseAgentName, ParsedAnswerSchema, type ParsedAnswer } from "@privett/core";
import { anthropic, fallbackParams } from "./anthropic";
import type { RunBudget } from "./cost";
import { CALL_ESTIMATE_USD } from "./cost";
import { errMessage, log } from "./log";

const AgentV4 = z.object({
  name: z.string(),
  position: z.number().int(),
  domain: z.string().nullable(),
  sentiment_label: z.enum(["positive", "neutral", "negative"]),
  sentiment_score: z.number().int(),
  descriptors: z.array(z.string()),
});
const AnswerV4 = z.object({ agents: z.array(AgentV4), notes: z.string().nullable() });

const SYSTEM = `You extract structured data from answers that AI assistants gave to UK consumers asking about estate agents and letting agents.

Return every estate agency, letting agency or property agent named in the answer, in the order each is first mentioned (position 1 = first named). Include online and hybrid agents (for example Purplebricks) if named as an option. Do not include portals (Rightmove, Zoopla, OnTheMarket), review sites, comparison sites, solicitors, mortgage brokers or the AI assistant itself. Do not add agents that are not named in the answer.

For each agent:
- name: as written in the answer, without extra words.
- domain: the agent's website host only if the answer gives or links it, else null.
- sentiment_label and sentiment_score: how the answer portrays this agent. 0 = very negative, 50 = neutral or purely factual, 100 = strongly recommended.
- descriptors: up to 5 short words or phrases the answer uses about this agent (e.g. "responsive", "high fees", "strong local knowledge"). Use the answer's own wording. Empty if none.

notes: a short note if the answer declines to name agents or is off-topic, else null.`;

export interface ParseOutcome {
  parsed: ParsedAnswer | null;
  error: string | null;
}

/** Normalises model output: positions renumbered 1..n, scores clamped, descriptors capped, duplicates dropped. */
export function cleanParsed(input: ParsedAnswer): ParsedAnswer {
  const seen = new Set<string>();
  const agents = [...input.agents]
    .sort((a, b) => a.position - b.position)
    .filter((a) => {
      const key = normaliseAgentName(a.name);
      if (!a.name.trim() || !key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((a, i) => ({
      ...a,
      name: a.name.trim(),
      position: i + 1,
      domain: a.domain?.trim() || null,
      sentiment_score: Math.max(0, Math.min(100, Math.round(a.sentiment_score))),
      descriptors: [...new Set(a.descriptors.map((d) => d.trim()).filter(Boolean))].slice(0, 5),
    }));
  return { agents, notes: input.notes };
}

export async function parseAnswer(
  question: string,
  answer: string,
  budget: RunBudget,
  model: string = getParserModel(),
): Promise<ParseOutcome> {
  budget.check(CALL_ESTIMATE_USD.parse);
  try {
    const res = await anthropic().beta.messages.parse({
      model,
      max_tokens: 4000,
      ...fallbackParams(model),
      system: SYSTEM,
      output_config: { effort: "low", format: betaZodOutputFormat(AnswerV4) },
      messages: [
        {
          role: "user",
          content: `Question the consumer asked:\n<question>${question}</question>\n\nAnswer the AI assistant gave:\n<answer>${answer}</answer>`,
        },
      ],
    });
    await budget.record({
      provider: "anthropic",
      model: res.model ?? model,
      purpose: "parse",
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
      costUsd: estimateCostUsd(res.model ?? model, {
        inputTokens: res.usage.input_tokens,
        outputTokens: res.usage.output_tokens,
        requests: 0,
      }),
    });
    if (res.stop_reason === "refusal") return { parsed: null, error: "parser declined" };
    if (res.stop_reason === "max_tokens") return { parsed: null, error: "parser output truncated" };
    const checked = ParsedAnswerSchema.safeParse(res.parsed_output);
    if (!checked.success) return { parsed: null, error: "parser output failed validation" };
    return { parsed: cleanParsed(checked.data), error: null };
  } catch (err) {
    log.warn("parse failed", { err: errMessage(err) });
    return { parsed: null, error: errMessage(err) };
  }
}

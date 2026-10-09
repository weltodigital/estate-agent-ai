import { fmt } from "@privett/core";
import type { MetricKey } from "@/lib/data/overview";

// Card names, agent-facing copy and exact formulas (from the build spec).
export const METRIC_COPY: Record<
  MetricKey,
  { label: string; blurb: string; formula: string; format: (v: number | null) => string; changeUnit: string }
> = {
  visibility: {
    label: "Visibility",
    blurb: "How often AI names you when people ask for an agent in your area.",
    formula: "Responses that name you ÷ all responses to your tracked prompts, as a percentage. Unweighted.",
    format: fmt.pct,
    changeUnit: " pts",
  },
  position: {
    label: "Position",
    blurb: "Where you appear in the list when AI does name you.",
    formula: "Your average rank among the agents named, counted only in responses that name you. 1 means named first; lower is better.",
    format: fmt.position,
    changeUnit: "",
  },
  sentiment: {
    label: "Sentiment",
    blurb: "How AI describes your agency.",
    formula: "Average sentiment score (0 to 100) across responses that name you, scored when each answer is parsed.",
    format: fmt.score,
    changeUnit: "",
  },
  shareOfVoice: {
    label: "Share of voice",
    blurb: "Your share of all agent mentions in your area, compared to competitors.",
    formula: "Your mentions ÷ mentions of every agent named across the same responses, as a percentage.",
    format: fmt.pct,
    changeUnit: " pts",
  },
};

export function sampleText(metric: MetricKey, responses: number, mentions: number, sentimentSamples: number): string {
  if (metric === "visibility" || metric === "shareOfVoice") return `Based on ${responses} response${responses === 1 ? "" : "s"}.`;
  if (metric === "sentiment") return `Based on ${sentimentSamples} response${sentimentSamples === 1 ? "" : "s"} that name you.`;
  return `Based on ${mentions} response${mentions === 1 ? "" : "s"} that name you.`;
}

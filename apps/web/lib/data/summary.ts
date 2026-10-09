// The plain-English overview: the answer first, then who beats you, what to
// fix and where you're missing. Pure functions over the same stored responses
// and core metric formulas the Evidence pages use, so nothing here is a new
// number: it's the same data, said simply.

import {
  BRANCH_KEY,
  computeSubjectMetrics,
  engineLabel,
  ENGINE_IDS,
  filterResponses,
  perPromptMetrics,
  type MetricResponse,
} from "@privett/core";

export interface SummaryInput {
  responses: MetricResponse[];
  competitors: { id: string; name: string }[];
  /** Current window [from, now) and the previous equal-length window. */
  from: string;
  prevFrom: string;
  lowSampleThreshold: number;
}

export interface Summary {
  /** Parsed responses in the current window. */
  answers: number;
  visibility: number | null;
  previousVisibility: number | null;
  /** Typical place in the list when named, rounded (1 = first). */
  usualPlace: number | null;
  lowSample: boolean;
  /** You plus the agents AI names most, by visibility. */
  ranking: { name: string; visibility: number; isYou: boolean }[];
  /** Questions where you're named least (with enough answers to judge). */
  missing: { prompt: string; named: number; of: number }[];
  byEngine: { engine: string; label: string; visibility: number | null; answers: number }[];
  describedAs: string[];
}

/** "4 out of 10". Rounds to the nearest whole answer, but never shows 0 for a non-zero rate. */
export function outOfTen(pct: number | null): number | null {
  if (pct === null) return null;
  if (pct > 0 && pct < 5) return 1;
  return Math.round(pct / 10);
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export function buildSummary(input: SummaryInput): Summary {
  const { responses, competitors, from, prevFrom, lowSampleThreshold } = input;
  const current = { from };
  const scoped = filterResponses(responses, current);
  const you = computeSubjectMetrics(responses, BRANCH_KEY, { filter: current, lowSampleThreshold });
  const prev = computeSubjectMetrics(responses, BRANCH_KEY, { filter: { from: prevFrom, to: from }, lowSampleThreshold });

  const others = competitors
    .map((c) => ({ name: c.name, visibility: computeSubjectMetrics(responses, c.id, { filter: current }).visibility ?? 0, isYou: false }))
    .filter((c) => c.visibility > 0)
    .sort((a, b) => b.visibility - a.visibility)
    .slice(0, 4);
  const ranking = [...others, { name: "You", visibility: you.visibility ?? 0, isYou: true }].sort((a, b) => b.visibility - a.visibility);

  const minAnswers = 3;
  const missing = perPromptMetrics(scoped, BRANCH_KEY, { lowSampleThreshold: 1 })
    .filter((p) => p.responses >= minAnswers && (p.visibility ?? 0) < 50)
    .sort((a, b) => (a.visibility ?? 0) - (b.visibility ?? 0) || b.responses - a.responses)
    .slice(0, 3)
    .map((p) => ({ prompt: p.promptText, named: p.mentions, of: p.responses }));

  const byEngine = ENGINE_IDS.map((engine) => {
    const m = computeSubjectMetrics(responses, BRANCH_KEY, { filter: { ...current, engines: [engine] }, lowSampleThreshold });
    return { engine, label: engineLabel(engine), visibility: m.visibility, answers: m.responses };
  });

  return {
    answers: you.responses,
    visibility: you.visibility,
    previousVisibility: prev.responses ? prev.visibility : null,
    usualPlace: you.position === null ? null : Math.max(1, Math.round(you.position)),
    lowSample: you.lowSample,
    ranking,
    missing,
    byEngine,
    describedAs: you.topDescriptors.slice(0, 3).map((d) => d.descriptor),
  };
}

/** One sentence for a fix's "why": the first sentence of the stored reason. */
export function firstSentence(text: string): string {
  const m = text.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : text).trim();
}

export const EFFORT_LABEL: Record<"S" | "M" | "L", string> = {
  S: "Quick win",
  M: "A few hours",
  L: "A bigger job",
};

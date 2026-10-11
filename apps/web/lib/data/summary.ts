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
  byEngine: { engine: string; label: string; visibility: number | null; answers: number; mentions: number }[];
  describedAs: string[];
  /** Every agent named, by share of all agent mentions (you included even at 0). */
  voice: { id: string | null; name: string; share: number; isYou: boolean }[];
  /** Your 1-based place in `voice`. */
  voiceRank: number;
  /** The competitor named in the most answers, if any. */
  mostNamed: string | null;
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
    return { engine, label: engineLabel(engine), visibility: m.visibility, answers: m.responses, mentions: m.mentions };
  });

  const voice = [
    { id: null, name: "You", share: you.shareOfVoice ?? 0, isYou: true },
    ...competitors
      .map((c) => ({ id: c.id, name: c.name, share: computeSubjectMetrics(responses, c.id, { filter: current }).shareOfVoice ?? 0, isYou: false }))
      .filter((c) => c.share > 0),
  ].sort((a, b) => b.share - a.share || Number(b.isYou) - Number(a.isYou) || a.name.localeCompare(b.name));

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
    voice,
    voiceRank: voice.findIndex((v) => v.isYou) + 1,
    mostNamed: others[0]?.name ?? null,
  };
}

export type HeadlinePart = { text: string; strong?: boolean };

/**
 * The overview headline, by template (never an LLM), so it can't say anything
 * the numbers don't. Strong parts are the key figures.
 */
export function buildHeadline(s: Summary, opts: { firstScan: boolean; days: number }): HeadlinePart[] {
  const engines = s.byEngine.filter((e) => e.answers > 0);
  const who = listPlain(engines.map((e) => e.label)) || "AI assistants";
  const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v)}%`);
  const parts: HeadlinePart[] = [];
  if (opts.firstScan) parts.push({ text: "This is your first scan. " });

  if (!s.visibility) {
    parts.push({ text: `${who} didn't name you in any of ` }, { text: `${s.answers} answers`, strong: true }, { text: " yet." });
  } else {
    parts.push({ text: `${who} named you in ` }, { text: `${pct(s.visibility)} of answers`, strong: true });
    parts.push({ text: ` in the last ${opts.days} days` });
    if (!opts.firstScan && s.previousVisibility !== null) {
      const diff = Math.round(s.visibility) - Math.round(s.previousVisibility);
      if (diff > 0) parts.push({ text: ", up from " }, { text: pct(s.previousVisibility), strong: true });
      else if (diff < 0) parts.push({ text: ", down from " }, { text: pct(s.previousVisibility), strong: true });
      else parts.push({ text: ", the same as the 30 days before" });
    }
    parts.push({ text: "." });
  }
  if (s.mostNamed) parts.push({ text: " " }, { text: s.mostNamed, strong: true }, { text: " was named most often." });

  // Biggest gap: the assistant naming you least, among those with enough answers.
  const gap = [...engines].filter((e) => e.answers >= 3).sort((a, b) => (a.visibility ?? 0) - (b.visibility ?? 0))[0];
  if (gap && engines.length > 1 && (gap.visibility ?? 0) < (s.visibility ?? 0)) {
    parts.push(
      { text: " Your biggest gap is " },
      { text: gap.label, strong: true },
      { text: `, which named you in ${gap.mentions} of ${gap.answers} answers.` },
    );
  }
  if (s.lowSample) parts.push({ text: ` Early days: based on ${s.answers} answers, so expect this to move.` });
  return parts;
}

function listPlain(words: string[]): string {
  return words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words.at(-1)}` : (words[0] ?? "");
}

const rtf = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });

/** "2 days ago", "in 5 days", "today". */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const days = Math.round((new Date(iso).getTime() - now.getTime()) / 86_400_000);
  if (Math.abs(days) >= 1) return rtf.format(days, "day");
  const hours = Math.round((new Date(iso).getTime() - now.getTime()) / 3_600_000);
  return Math.abs(hours) >= 1 ? rtf.format(hours, "hour") : "just now";
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

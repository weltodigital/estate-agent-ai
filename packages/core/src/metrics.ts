// The four headline metrics. Pure functions over stored responses so every
// number on the dashboard can be recomputed from raw data and traced back to
// the responses behind it.
//
// Unit: one response = one prompt x one engine x one run.
// Responses whose answer failed to parse (or the engine errored) are excluded
// from every denominator: we don't know whether the agent was named, and
// counting them as "not named" would fabricate a lower score.

export interface ResponseAgent {
  /** "branch", a competitor id, or a league agent id. Null if unmatched. */
  subjectKey: string | null;
  /** Normalised name, used for share of voice and unmatched agents. */
  normalisedName: string;
  position: number;
  sentimentScore: number | null;
  descriptors: string[];
  /** Low-confidence matches are not counted as mentions. */
  confidence: "high" | "low" | "none";
}

export interface MetricResponse {
  id: string;
  engine: string;
  intentGroup: string;
  createdAt: string; // ISO
  promptText: string;
  parsed: boolean;
  agents: ResponseAgent[];
}

export interface MetricFilter {
  engines?: string[];
  intentGroups?: string[];
  from?: string; // ISO, inclusive
  to?: string; // ISO, exclusive
}

export interface SubjectMetrics {
  /** Parsed responses in scope: the denominator for visibility. */
  responses: number;
  /** Responses that name the subject. */
  mentions: number;
  /** % 0-100, or null if no responses. */
  visibility: number | null;
  /** Mean rank among agents named, over responses that name the subject. */
  position: number | null;
  /** Mean 0-100 sentiment over responses that name the subject (and have a score). */
  sentiment: number | null;
  sentimentSamples: number;
  /** % 0-100 of all agent mentions in the same responses. */
  shareOfVoice: number | null;
  /** All agent mentions across the same responses (SoV denominator). */
  totalAgentMentions: number;
  topDescriptors: { descriptor: string; count: number }[];
  lowSample: boolean;
  /** Ids of responses in scope, for the evidence drawer. */
  responseIds: string[];
  /** Ids of responses that name the subject. */
  mentionResponseIds: string[];
}

export function filterResponses(responses: MetricResponse[], f: MetricFilter = {}): MetricResponse[] {
  return responses.filter(
    (r) =>
      (!f.engines?.length || f.engines.includes(r.engine)) &&
      (!f.intentGroups?.length || f.intentGroups.includes(r.intentGroup)) &&
      (!f.from || r.createdAt >= f.from) &&
      (!f.to || r.createdAt < f.to),
  );
}

/** Counted mentions in a response: one per distinct agent, high-confidence or unmatched-but-named. */
function countedAgents(r: MetricResponse): ResponseAgent[] {
  const seen = new Set<string>();
  const out: ResponseAgent[] = [];
  for (const a of [...r.agents].sort((x, y) => x.position - y.position)) {
    const id = a.confidence === "high" && a.subjectKey ? `k:${a.subjectKey}` : `n:${a.normalisedName}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(a);
  }
  return out;
}

function findSubject(r: MetricResponse, subjectKey: string): ResponseAgent | undefined {
  return r.agents
    .filter((a) => a.subjectKey === subjectKey && a.confidence === "high")
    .sort((x, y) => x.position - y.position)[0];
}

export function computeSubjectMetrics(
  responses: MetricResponse[],
  subjectKey: string,
  opts: { filter?: MetricFilter; lowSampleThreshold?: number } = {},
): SubjectMetrics {
  const scoped = filterResponses(responses, opts.filter).filter((r) => r.parsed);
  const threshold = opts.lowSampleThreshold ?? 20;

  let mentions = 0;
  let positionSum = 0;
  let sentimentSum = 0;
  let sentimentSamples = 0;
  let totalAgentMentions = 0;
  const descriptorCounts = new Map<string, number>();
  const mentionResponseIds: string[] = [];

  for (const r of scoped) {
    const counted = countedAgents(r);
    totalAgentMentions += counted.length;
    const hit = findSubject(r, subjectKey);
    if (!hit) continue;
    mentions += 1;
    mentionResponseIds.push(r.id);
    positionSum += hit.position;
    if (hit.sentimentScore !== null) {
      sentimentSum += hit.sentimentScore;
      sentimentSamples += 1;
    }
    for (const d of hit.descriptors) {
      const k = d.trim().toLowerCase();
      if (k) descriptorCounts.set(k, (descriptorCounts.get(k) ?? 0) + 1);
    }
  }

  const n = scoped.length;
  return {
    responses: n,
    mentions,
    visibility: n ? (mentions / n) * 100 : null,
    position: mentions ? positionSum / mentions : null,
    sentiment: sentimentSamples ? sentimentSum / sentimentSamples : null,
    sentimentSamples,
    shareOfVoice: totalAgentMentions ? (mentions / totalAgentMentions) * 100 : null,
    totalAgentMentions,
    topDescriptors: [...descriptorCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([descriptor, count]) => ({ descriptor, count })),
    lowSample: n < threshold,
    responseIds: scoped.map((r) => r.id),
    mentionResponseIds,
  };
}

export interface MetricDelta {
  current: number | null;
  previous: number | null;
  change: number | null;
}

export function delta(current: number | null, previous: number | null): MetricDelta {
  return {
    current,
    previous,
    change: current !== null && previous !== null ? current - previous : null,
  };
}

/** ISO date (yyyy-mm-dd) of the Monday starting the week containing `iso`. UTC. */
export function weekStart(iso: string): string {
  const d = new Date(iso);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

/** Weekly trend for a subject. */
export function weeklyTrend(
  responses: MetricResponse[],
  subjectKey: string,
  opts: { filter?: MetricFilter; lowSampleThreshold?: number } = {},
): ({ weekStart: string } & SubjectMetrics)[] {
  const scoped = filterResponses(responses, opts.filter);
  const weeks = new Map<string, MetricResponse[]>();
  for (const r of scoped) {
    const w = weekStart(r.createdAt);
    const list = weeks.get(w) ?? [];
    list.push(r);
    weeks.set(w, list);
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([w, rs]) => ({
      weekStart: w,
      ...computeSubjectMetrics(rs, subjectKey, { lowSampleThreshold: opts.lowSampleThreshold }),
    }));
}

/** Per-prompt visibility and position for the branch. */
export function perPromptMetrics(
  responses: MetricResponse[],
  subjectKey: string,
  opts: { filter?: MetricFilter; lowSampleThreshold?: number } = {},
) {
  const byPrompt = new Map<string, MetricResponse[]>();
  for (const r of filterResponses(responses, opts.filter)) {
    const list = byPrompt.get(r.promptText) ?? [];
    list.push(r);
    byPrompt.set(r.promptText, list);
  }
  return [...byPrompt.entries()].map(([promptText, rs]) => ({
    promptText,
    intentGroup: rs[0]?.intentGroup ?? "",
    ...computeSubjectMetrics(rs, subjectKey, { lowSampleThreshold: opts.lowSampleThreshold }),
  }));
}

/** Formatting helpers. Missing values are always "—", never 0. */
export const fmt = {
  pct: (v: number | null) => (v === null ? "—" : `${Math.round(v)}%`),
  position: (v: number | null) => (v === null ? "—" : `#${v.toFixed(1)}`),
  score: (v: number | null) => (v === null ? "—" : `${Math.round(v)}`),
  signedPts: (v: number | null) =>
    v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(Math.round(v * 10) / 10)}`,
};

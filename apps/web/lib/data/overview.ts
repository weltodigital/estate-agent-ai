// Composes the dashboard's numbers from metric responses. Pure: every value
// comes from core metric functions over stored responses.

import {
  BRANCH_KEY,
  computeSubjectMetrics,
  weeklyTrend,
  type MetricFilter,
  type MetricResponse,
  type SubjectMetrics,
} from "@privett/core";

export type MetricKey = "visibility" | "position" | "sentiment" | "shareOfVoice";

export const METRIC_KEYS: MetricKey[] = ["visibility", "position", "sentiment", "shareOfVoice"];

export interface SubjectRef {
  key: string;
  name: string;
}

export interface CardData {
  key: MetricKey;
  current: number | null;
  previous: number | null;
  change: number | null;
  /** Weekly values for the sparkline, oldest first. */
  trend: (number | null)[];
  competitors: { name: string; value: number | null }[];
  metrics: SubjectMetrics;
}

export function metricValue(m: SubjectMetrics, key: MetricKey): number | null {
  return m[key];
}

/** Competitors ranked by visibility over the current period (hidden excluded by caller). */
export function topCompetitors(
  responses: MetricResponse[],
  competitors: SubjectRef[],
  filter: MetricFilter,
  n = 3,
): (SubjectRef & { metrics: SubjectMetrics })[] {
  return competitors
    .map((c) => ({ ...c, metrics: computeSubjectMetrics(responses, c.key, { filter }) }))
    .filter((c) => c.metrics.mentions > 0)
    .sort((a, b) => (b.metrics.visibility ?? 0) - (a.metrics.visibility ?? 0) || a.name.localeCompare(b.name))
    .slice(0, n);
}

export function buildCards(opts: {
  responses: MetricResponse[];
  current: MetricFilter;
  previous: MetricFilter;
  trendFilter: MetricFilter;
  competitors: SubjectRef[];
  lowSampleThreshold: number;
}): { cards: CardData[]; top: (SubjectRef & { metrics: SubjectMetrics })[] } {
  const { responses, current, previous, trendFilter, lowSampleThreshold } = opts;
  const cur = computeSubjectMetrics(responses, BRANCH_KEY, { filter: current, lowSampleThreshold });
  const prev = computeSubjectMetrics(responses, BRANCH_KEY, { filter: previous, lowSampleThreshold });
  const trend = weeklyTrend(responses, BRANCH_KEY, { filter: trendFilter, lowSampleThreshold });
  const top = topCompetitors(responses, opts.competitors, current);

  const cards = METRIC_KEYS.map((key): CardData => {
    const c = metricValue(cur, key);
    const p = metricValue(prev, key);
    return {
      key,
      current: c,
      previous: p,
      change: c !== null && p !== null ? c - p : null,
      trend: trend.map((w) => metricValue(w, key)),
      competitors: top.map((t) => ({ name: t.name, value: metricValue(t.metrics, key) })),
      metrics: cur,
    };
  });
  return { cards, top };
}

/** Per-engine breakdown of all four metrics for the branch. */
export function perEngine(responses: MetricResponse[], filter: MetricFilter, lowSampleThreshold: number) {
  const engines = [...new Set(responses.map((r) => r.engine))].sort();
  return engines.map((engine) => ({
    engine,
    metrics: computeSubjectMetrics(responses, BRANCH_KEY, {
      filter: { ...filter, engines: [engine] },
      lowSampleThreshold,
    }),
  }));
}

export interface TrendPoint {
  week: string;
  [series: string]: number | null | string;
}

/** Weekly series of one metric for the branch and the given competitors. */
export function trendSeries(
  responses: MetricResponse[],
  subjects: SubjectRef[],
  filter: MetricFilter,
  key: MetricKey,
): TrendPoint[] {
  const weeks = new Map<string, TrendPoint>();
  for (const s of [{ key: BRANCH_KEY, name: "You" }, ...subjects]) {
    for (const w of weeklyTrend(responses, s.key, { filter })) {
      const row = weeks.get(w.weekStart) ?? { week: w.weekStart };
      row[s.name] = metricValue(w, key);
      weeks.set(w.weekStart, row);
    }
  }
  return [...weeks.values()].sort((a, b) => a.week.localeCompare(b.week));
}

/** "Better" direction per metric: position is better when lower. */
export function isImprovement(key: MetricKey, change: number | null): boolean | null {
  if (change === null || change === 0) return null;
  return key === "position" ? change < 0 : change > 0;
}

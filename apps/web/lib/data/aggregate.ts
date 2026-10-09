// Pure aggregation helpers for the dashboard. No I/O; unit tested.

export interface CitationInput {
  scanResultId: string;
  domain: string;
  isOwnDomain: boolean;
  competitorId: string | null;
}

export interface CitationStat {
  domain: string;
  /** Distinct responses citing this domain. */
  responses: number;
  citesBranch: boolean;
  /** Competitor ids cited on this domain, or named in responses citing it. */
  competitorIds: string[];
  /** Distinct responses citing this domain where the branch was named. */
  responsesNamingBranch: number;
  sampleResultId: string;
}

/**
 * Aggregates citations by domain. `namedInResponse` maps a response id to the
 * competitor ids named in it and whether the branch was named.
 */
export function citationStats(
  citations: CitationInput[],
  namedInResponse: Map<string, { branch: boolean; competitorIds: string[] }>,
): CitationStat[] {
  const byDomain = new Map<
    string,
    { results: Set<string>; own: boolean; comps: Set<string>; namingBranch: Set<string>; sample: string }
  >();
  for (const c of citations) {
    const d = c.domain.toLowerCase().replace(/^www\./, "");
    const entry = byDomain.get(d) ?? { results: new Set(), own: false, comps: new Set(), namingBranch: new Set(), sample: c.scanResultId };
    entry.results.add(c.scanResultId);
    if (c.isOwnDomain) entry.own = true;
    if (c.competitorId) entry.comps.add(c.competitorId);
    const named = namedInResponse.get(c.scanResultId);
    if (named) {
      for (const id of named.competitorIds) entry.comps.add(id);
      if (named.branch) entry.namingBranch.add(c.scanResultId);
    }
    byDomain.set(d, entry);
  }
  return [...byDomain.entries()]
    .map(([domain, e]) => ({
      domain,
      responses: e.results.size,
      citesBranch: e.own,
      competitorIds: [...e.comps],
      responsesNamingBranch: e.namingBranch.size,
      sampleResultId: e.sample,
    }))
    .sort((a, b) => b.responses - a.responses || a.domain.localeCompare(b.domain));
}

/** A cited domain is a gap when it never cites the branch but does feature competitors. */
export function isCitationGap(s: CitationStat): boolean {
  return !s.citesBranch && s.competitorIds.length > 0;
}

/** Short excerpt around the first matching term (case-insensitive). Null if none match. */
export function extractSnippet(text: string | null | undefined, terms: string[], radius = 110): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  let idx = -1;
  let len = 0;
  for (const t of terms) {
    const term = t.trim().toLowerCase();
    if (!term) continue;
    const i = lower.indexOf(term);
    if (i >= 0) {
      idx = i;
      len = term.length;
      break;
    }
  }
  if (idx < 0) return null;
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + len + radius);
  const body = text
    .slice(start, end)
    .replace(/[*_#`>]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return `${start > 0 ? "…" : ""}${body}${end < text.length ? "…" : ""}`;
}

export interface ReferralInput {
  source: string;
  landing_path: string;
  ts: string;
}

/** Weekly (Monday-start, UTC) counts per source, oldest first. */
export function referralsByWeek(events: ReferralInput[]): { week: string; total: number; [source: string]: number | string }[] {
  const weeks = new Map<string, Record<string, number>>();
  for (const e of events) {
    const d = new Date(e.ts);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const w = d.toISOString().slice(0, 10);
    const row = weeks.get(w) ?? { total: 0 };
    row[e.source] = (row[e.source] ?? 0) + 1;
    row.total = (row.total ?? 0) + 1;
    weeks.set(w, row);
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, counts]) => ({ week, total: counts.total ?? 0, ...counts }));
}

export function countBy<T>(items: T[], key: (t: T) => string): { key: string; count: number }[] {
  const m = new Map<string, number>();
  for (const i of items) m.set(key(i), (m.get(key(i)) ?? 0) + 1);
  return [...m.entries()].map(([k, count]) => ({ key: k, count })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

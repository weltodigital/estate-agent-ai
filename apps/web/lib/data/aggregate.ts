// Pure aggregation helpers for the dashboard. No I/O; unit tested.

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

// Live scan progress (UX spec section 4): pure shaping for the progress
// endpoint and panel. No I/O; unit tested.

import { engineLabel } from "@privett/core";

export const FINISHED_STATUSES = ["completed", "failed", "budget_exceeded"] as const;

export interface EngineProgress {
  engine: string;
  label: string;
  done: number;
  total: number;
}

export interface TickerLine {
  /** Scan result id, stable key for animation. */
  id: string;
  engine: string;
  label: string;
  names: { name: string; isBranch: boolean }[];
}

export interface ScanProgressPayload {
  status: string;
  engines: string[];
  perEngine: EngineProgress[];
  done: number;
  total: number;
  ticker: TickerLine[];
  startedAt: string | null;
  finishedAt: string | null;
  /** Seconds left, or null when unknown or finished. */
  etaSeconds: number | null;
}

/** Per-engine progress: each engine gets an equal share of the run's total. */
export function perEngineProgress(
  engines: string[],
  runTotal: number,
  doneByEngine: Map<string, number>,
): EngineProgress[] {
  const share = engines.length ? Math.ceil(runTotal / engines.length) : 0;
  return engines.map((engine) => {
    const done = doneByEngine.get(engine) ?? 0;
    return { engine, label: engineLabel(engine), done, total: Math.max(share, done) };
  });
}

/** Seconds left: remaining answers x measured seconds per answer so far (fallback 4s). */
export function estimateEtaSeconds(opts: {
  done: number;
  total: number;
  startedAt: string | null;
  now?: number;
  fallbackPerAnswer?: number;
}): number | null {
  const { done, total, startedAt, now = Date.now(), fallbackPerAnswer = 4 } = opts;
  if (!total) return null;
  const remaining = Math.max(total - done, 0);
  if (!remaining) return 0;
  let perAnswer = fallbackPerAnswer;
  if (startedAt && done > 0) {
    const elapsed = (now - Date.parse(startedAt)) / 1000;
    if (elapsed > 0) perAnswer = elapsed / done;
  }
  return Math.round(remaining * perAnswer);
}

/** "Less than a minute left", "About 2 minutes left". */
export function etaLabel(seconds: number | null): string | null {
  if (seconds === null) return null;
  if (seconds < 60) return "Less than a minute left";
  const minutes = Math.round(seconds / 60);
  return `About ${minutes} minute${minutes === 1 ? "" : "s"} left`;
}

/**
 * Ticker: the most recent parsed results that named anyone, newest first,
 * each with the agents in the order the answer named them.
 */
export function buildTicker(
  results: { id: string; engine: string; created_at: string }[],
  mentions: { scan_result_id: string; agent_name: string; position: number; is_branch: boolean; match_confidence: string }[],
  limit = 12,
): TickerLine[] {
  const byResult = new Map<string, typeof mentions>();
  for (const m of mentions) {
    const list = byResult.get(m.scan_result_id) ?? [];
    list.push(m);
    byResult.set(m.scan_result_id, list);
  }
  return [...results]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .filter((r) => byResult.has(r.id))
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      engine: r.engine,
      label: engineLabel(r.engine),
      names: byResult
        .get(r.id)!
        .sort((a, b) => a.position - b.position)
        .map((m) => ({ name: m.agent_name, isBranch: m.is_branch && m.match_confidence === "high" })),
    }));
}

export function isFinished(status: string): boolean {
  return (FINISHED_STATUSES as readonly string[]).includes(status);
}

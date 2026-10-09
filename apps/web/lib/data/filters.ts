// Dashboard filters, parsed from searchParams. Pure, so it is unit tested.

import { INTENT_GROUPS, isEngineId } from "@privett/core";

export const DAY_PRESETS = [7, 30, 90] as const;
export type DayPreset = (typeof DAY_PRESETS)[number];

export type SearchParams = Record<string, string | string[] | undefined>;

export interface DashFilters {
  engine: string | null;
  intent: string | null;
  days: DayPreset;
  /** Current period [from, to). ISO. */
  from: string;
  to: string;
  /** Previous equal-length period [prevFrom, from). */
  prevFrom: string;
}

const DAY_MS = 86_400_000;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseFilters(sp: SearchParams, now: Date = new Date()): DashFilters {
  const engineRaw = first(sp.engine);
  const intentRaw = first(sp.intent);
  const daysRaw = Number(first(sp.days));
  const days = (DAY_PRESETS as readonly number[]).includes(daysRaw) ? (daysRaw as DayPreset) : 30;
  const to = now.toISOString();
  const from = new Date(now.getTime() - days * DAY_MS).toISOString();
  const prevFrom = new Date(now.getTime() - 2 * days * DAY_MS).toISOString();
  return {
    engine: engineRaw && isEngineId(engineRaw) ? engineRaw : null,
    intent: intentRaw && (INTENT_GROUPS as readonly string[]).includes(intentRaw) ? intentRaw : null,
    days,
    from,
    to,
    prevFrom,
  };
}

/** Metric filter for the core functions. */
export function metricFilter(f: DashFilters, period: "current" | "previous" = "current") {
  return {
    engines: f.engine ? [f.engine] : undefined,
    intentGroups: f.intent ? [f.intent] : undefined,
    from: period === "current" ? f.from : f.prevFrom,
    to: period === "current" ? f.to : f.from,
  };
}

/** Builds a query string keeping the current filters, with overrides. Null removes a key. */
export function filterQuery(f: Pick<DashFilters, "engine" | "intent" | "days">, overrides: Record<string, string | null> = {}): string {
  const params = new URLSearchParams();
  if (f.engine) params.set("engine", f.engine);
  if (f.intent) params.set("intent", f.intent);
  params.set("days", String(f.days));
  for (const [k, v] of Object.entries(overrides)) {
    if (v === null) params.delete(k);
    else params.set(k, v);
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

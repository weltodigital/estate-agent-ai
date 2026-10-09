// Snapshot signals for a branch and its top competitors, stored with
// timestamps so changes (and fixes) can be seen over time.

import type { GoogleBusinessSignal, WebsiteCrawlSignal } from "@privett/core";
import type { RunBudget } from "../cost";
import { db, must } from "../db";
import { env } from "../env";
import { errMessage, log } from "../log";
import { crawlWebsite } from "./crawl";
import { lookupPlace, placesEnabled } from "./places";

export interface SignalSubject {
  kind: "branch" | "competitor";
  id: string;
  orgId: string;
  name: string;
  website: string | null;
  domain: string | null;
  town: string;
  areas: string[];
  placeId: string | null;
}

export interface SubjectSignals {
  crawl: WebsiteCrawlSignal | null;
  gbp: GoogleBusinessSignal | null;
}

async function store(subject: SignalSubject, runId: string | null, type: string, value: unknown) {
  must(
    await db().from("signals").insert({
      org_id: subject.orgId,
      branch_id: subject.kind === "branch" ? subject.id : null,
      competitor_id: subject.kind === "competitor" ? subject.id : null,
      scan_run_id: runId,
      type,
      value_json: value,
    }),
    "insert signals",
  );
}

export async function collectSignals(
  subject: SignalSubject,
  opts: { runId: string | null; budget: RunBudget; places: boolean },
): Promise<SubjectSignals> {
  const out: SubjectSignals = { crawl: null, gbp: null };
  const site = subject.website ?? (subject.domain ? `https://${subject.domain}` : null);
  if (site) {
    try {
      out.crawl = await crawlWebsite({ website: site, town: subject.town, areas: subject.areas });
      await store(subject, opts.runId, "website_crawl", out.crawl);
    } catch (err) {
      log.warn("crawl failed", { subject: subject.id, err: errMessage(err) });
    }
  }
  if (opts.places && placesEnabled() && !opts.budget.exceeded) {
    try {
      const { signal, calls } = await lookupPlace({ name: subject.name, town: subject.town, domain: subject.domain, placeId: subject.placeId });
      await opts.budget.record({ provider: "google", model: "places", purpose: "places", costUsd: calls * env.placesCostPerCall });
      out.gbp = signal;
      await store(subject, opts.runId, "google_business", signal);
      if (signal.placeId && !subject.placeId) {
        const table = subject.kind === "branch" ? "branches" : "competitors";
        must(await db().from(table).update({ place_id: signal.placeId }).eq("id", subject.id), `update ${table}.place_id`);
      }
    } catch (err) {
      log.warn("places lookup failed", { subject: subject.id, err: errMessage(err) });
    }
  }
  return out;
}

/** Latest stored signal of a type for each subject id. */
export async function latestSignals<T>(column: "branch_id" | "competitor_id", ids: string[], type: string): Promise<Map<string, T>> {
  const map = new Map<string, T>();
  if (!ids.length) return map;
  const rows = must(
    await db().from("signals").select(`${column}, value_json, captured_at`).in(column, ids).eq("type", type).order("captured_at", { ascending: false }).limit(1000),
    "select signals",
  ) as Record<string, unknown>[];
  for (const r of rows) {
    const id = r[column] as string;
    if (!map.has(id)) map.set(id, r.value_json as T);
  }
  return map;
}

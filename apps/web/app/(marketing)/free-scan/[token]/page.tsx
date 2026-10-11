import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import {
  BRANCH_KEY,
  engineLabel,
  toMetricResponses,
  type AgentMentionRow,
  type ScanResultRow,
} from "@privett/core";
import { AutoRefresh } from "@/components/marketing/auto-refresh";
import { buttonClasses } from "@/components/ui/button";
import { COPY } from "@/lib/copy";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { excerpt } from "@/lib/data/plain-text";
import { buildSummary, EFFORT_LABEL, firstSentence, ordinal, outOfTen } from "@/lib/data/summary";
import { RankingBars } from "@/components/dashboard/ranking-bars";

export const metadata = { title: "Your free scan", robots: { index: false } };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function FreeScanResultPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!UUID.test(token)) notFound();
  const admin = getSupabaseAdminClient();
  const { data: scan } = await admin
    .from("free_scans")
    .select("agency_name, town, domain, branch_id, scan_run_id")
    .eq("access_token", token)
    .maybeSingle();
  if (!scan?.branch_id || !scan.scan_run_id) notFound();

  const { data: run } = await admin.from("scan_runs").select("status, progress").eq("id", scan.scan_run_id).single();
  const status = run?.status ?? "queued";
  const inFlight = status === "queued" || status === "running";

  const [{ data: results }, { data: competitors }, { data: recs }, { data: crawlRows }] = await Promise.all([
    admin
      .from("scan_results")
      .select("id, engine, intent_group, created_at, prompt_text, parse_status, answer_text")
      .eq("scan_run_id", scan.scan_run_id)
      .order("created_at"),
    admin.from("competitors").select("id, name, status").eq("branch_id", scan.branch_id).neq("status", "hidden"),
    admin
      .from("recommendations")
      .select("title, why, asset_kind, asset_text, asset_status, priority, effort")
      .eq("branch_id", scan.branch_id)
      .eq("status", "todo")
      .order("priority")
      .order("first_seen_at"),
    admin
      .from("signals")
      .select("value_json")
      .eq("branch_id", scan.branch_id)
      .eq("type", "website_crawl")
      .order("captured_at", { ascending: false })
      .limit(1),
  ]);
  const crawl = crawlRows?.[0]?.value_json as { ok?: boolean; error?: string } | undefined;
  const siteBlocked = crawl ? !crawl.ok : false;
  const ids = (results ?? []).map((r) => r.id);
  const { data: mentions } = ids.length
    ? await admin
        .from("agent_mentions")
        .select("scan_result_id, agent_name, normalised_name, position, is_branch, matched_competitor_id, matched_league_agent_id, match_confidence, sentiment_score, descriptors")
        .in("scan_result_id", ids)
    : { data: [] };

  const responses = toMetricResponses((results ?? []) as ScanResultRow[], (mentions ?? []) as AgentMentionRow[]);
  // Same helper as the dashboard overview, over this one scan.
  const summary = buildSummary({
    responses,
    competitors: (competitors ?? []).map((c) => ({ id: c.id, name: c.name })),
    from: "1970-01-01T00:00:00Z",
    prevFrom: "1970-01-01T00:00:00Z",
    lowSampleThreshold: 0,
  });
  const engines = [...new Set(responses.map((r) => engineLabel(r.engine)))];
  const first = recs?.[0];
  const locked = Math.max((recs?.length ?? 0) - 1, 0);
  const progress = run?.progress as { done?: number; total?: number } | null;

  const namesByResult = new Map<string, string[]>();
  for (const m of (mentions ?? []) as (AgentMentionRow & { agent_name: string })[]) {
    const list = namesByResult.get(m.scan_result_id) ?? [];
    list[m.position - 1] = m.agent_name;
    namesByResult.set(m.scan_result_id, list);
  }
  const evidence = (results ?? []).filter((r) => r.parse_status === "ok");

  return (
    <section className="mx-auto max-w-4xl px-4 py-14 md:px-8">
      <AutoRefresh active={inFlight} />
      <p className="text-label uppercase text-ink-muted">Free scan · {scan.town}</p>
      <h1 className="mt-2 text-display text-ink">{scan.agency_name}</h1>

      {inFlight ? (
        <div className="mt-8 rounded-lg border border-hairline bg-surface-sunken p-6">
          <p className="font-medium">Asking AI assistants about agents in {scan.town}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {progress?.total ? `${progress.done ?? 0} of ${progress.total} answers collected. ` : ""}This page updates by itself. It usually takes a few minutes.
          </p>
        </div>
      ) : status !== "completed" && !responses.length ? (
        <div className="mt-8 rounded-lg border border-hairline bg-surface-sunken p-6">
          <p className="font-medium">We couldn't finish this scan.</p>
          <p className="mt-1 text-sm text-ink-muted">Please try again later, or sign up to track your branch every week.</p>
        </div>
      ) : null}

      {responses.length ? (
        <>
          {/* The answer */}
          <div className="mt-8">
            <p className="text-[22px] leading-[30px] text-ink md:text-[26px] md:leading-[34px]">
              When people ask AI for an estate agent in {scan.town}, {scan.agency_name} was named in{" "}
              <span className="font-semibold">{outOfTen(summary.visibility)} out of 10</span> answers.
            </p>
            <p className="mt-2 text-ink-muted">
              {summary.usualPlace ? `When named, it was usually listed ${ordinal(summary.usualPlace)}. ` : ""}
              {summary.describedAs.length ? `AI described it as ${listWords(summary.describedAs)}.` : ""}
            </p>
            <p className="mt-2 text-small text-ink-muted">
              A first look: {summary.answers} answers, one per question on {engines.join(" and ")}.
            </p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-hairline bg-surface-raised p-6">
              <h2 className="text-heading text-ink">Who AI names most</h2>
              <p className="mt-0.5 text-small text-ink-muted">Share of answers that name each agent.</p>
              <div className="mt-4">
                {summary.ranking.length > 1 ? (
                  <RankingBars rows={summary.ranking} youLabel={scan.agency_name} />
                ) : (
                  <p className="text-small text-ink-muted">{inFlight ? "Waiting for answers." : "No other agents were named."}</p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-hairline bg-surface-raised p-6">
              <h2 className="text-heading text-ink">Your first fix</h2>
              {first ? (
                <>
                  <p className="mt-2 font-medium text-ink">{first.title}</p>
                  <p className="mt-1 text-small text-ink-muted">
                    {firstSentence(first.why)} · {EFFORT_LABEL[first.effort as "S" | "M" | "L"] ?? ""}
                  </p>
                  {first.asset_text ? (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-small font-medium text-brand">See the draft to copy</summary>
                      <p className="mt-2 text-small text-ink-muted">{COPY.draftLabel}</p>
                      <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-surface-sunken p-3 font-mono text-data">{first.asset_text}</pre>
                    </details>
                  ) : null}
                </>
              ) : inFlight ? (
                <p className="mt-2 text-small text-ink-muted">Working it out from your answers and website.</p>
              ) : (
                <p className="mt-2 text-small text-ink-muted">
                  {siteBlocked
                    ? "Your website turned away our automated check, so we couldn't review it. Fixes only appear when we have the evidence for them."
                    : "Nothing in this small sample pointed to a clear fix."}
                </p>
              )}
            </div>
          </div>

          {!inFlight ? (
            <div className="mt-6 flex flex-wrap items-center gap-4 rounded-lg bg-brand p-6 text-on-brand">
              <Lock size={20} strokeWidth={1.5} />
              <p className="flex-1">
                {locked > 0 ? `${locked} more fix${locked === 1 ? "" : "es"} found. ` : ""}
                Track {scan.agency_name} every week on up to four assistants, with every fix and the answers behind it.
              </p>
              <Link href="/login?next=/onboarding" className={buttonClasses("inverse")}>Keep these results</Link>
            </div>
          ) : null}

          {evidence.length ? (
            <details className="mt-10">
              <summary className="cursor-pointer font-medium text-ink">Read the answers behind this ({evidence.length})</summary>
              <div className="mt-4 space-y-3">
                {evidence.map((r) => {
                  const names = (namesByResult.get(r.id) ?? []).filter(Boolean);
                  const named = responses.find((x) => x.id === r.id)?.agents.some((a) => a.subjectKey === BRANCH_KEY && a.confidence === "high");
                  return (
                    <div key={r.id} className="rounded-lg border border-hairline bg-surface-raised p-4 text-sm">
                      <p className="text-ink">
                        &ldquo;{r.prompt_text}&rdquo; <span className="text-ink-muted">· {engineLabel(r.engine)} · {named ? "named you" : "didn’t name you"}</span>
                      </p>
                      {names.length ? <p className="mt-1 text-small text-ink-muted">Agents named: {names.join(", ")}</p> : null}
                      <p className="mt-2 rounded-md bg-surface-sunken p-3 font-mono text-data text-ink">{excerpt(r.answer_text, 400)}</p>
                    </div>
                  );
                })}
              </div>
            </details>
          ) : null}
        </>
      ) : null}

      <p className="mt-12 text-small text-ink-muted">{COPY.noPromise}</p>
    </section>
  );
}

/** AI's own words, quoted: "independent", "family-run" and "local". */
function listWords(words: string[]): string {
  const q = words.map((w) => `“${w}”`);
  return q.length > 1 ? `${q.slice(0, -1).join(", ")} and ${q.at(-1)}` : (q[0] ?? "");
}

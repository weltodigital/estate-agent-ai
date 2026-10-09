import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import {
  BRANCH_KEY,
  computeSubjectMetrics,
  engineLabel,
  fmt,
  toMetricResponses,
  type AgentMentionRow,
  type ScanResultRow,
} from "@privett/core";
import { AutoRefresh } from "@/components/marketing/auto-refresh";
import { buttonClasses } from "@/components/ui/button";
import { COPY } from "@/lib/copy";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

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

  const [{ data: results }, { data: competitors }, { data: recs }] = await Promise.all([
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
  ]);
  const ids = (results ?? []).map((r) => r.id);
  const { data: mentions } = ids.length
    ? await admin
        .from("agent_mentions")
        .select("scan_result_id, agent_name, normalised_name, position, is_branch, matched_competitor_id, matched_league_agent_id, match_confidence, sentiment_score, descriptors")
        .in("scan_result_id", ids)
    : { data: [] };

  const responses = toMetricResponses((results ?? []) as ScanResultRow[], (mentions ?? []) as AgentMentionRow[]);
  const branch = computeSubjectMetrics(responses, BRANCH_KEY);
  const top = (competitors ?? [])
    .map((c) => ({ name: c.name, m: computeSubjectMetrics(responses, c.id) }))
    .filter((c) => c.m.mentions > 0)
    .sort((a, b) => b.m.mentions - a.m.mentions)
    .slice(0, 3);
  const first = recs?.[0];
  const locked = Math.max((recs?.length ?? 0) - 1, 0);
  const progress = run?.progress as { done?: number; total?: number } | null;

  const namesByResult = new Map<string, string[]>();
  for (const m of (mentions ?? []) as (AgentMentionRow & { agent_name: string })[]) {
    const list = namesByResult.get(m.scan_result_id) ?? [];
    list[m.position - 1] = m.agent_name;
    namesByResult.set(m.scan_result_id, list);
  }
  const evidence = (results ?? []).filter((r) => r.parse_status === "ok").slice(0, 6);

  return (
    <section className="mx-auto max-w-4xl px-4 py-14 md:px-8">
      <AutoRefresh active={inFlight} />
      <p className="text-sm uppercase tracking-wide text-brand-slate">Free scan · {scan.town}</p>
      <h1 className="mt-2 text-4xl text-brand-ink">{scan.agency_name}</h1>

      {inFlight ? (
        <div className="mt-8 rounded-lg border border-brand-stone bg-brand-cream p-6">
          <p className="font-medium">Asking AI assistants about agents in {scan.town}</p>
          <p className="mt-1 text-sm text-brand-walnut">
            {progress?.total ? `${progress.done ?? 0} of ${progress.total} answers collected. ` : ""}This page updates by itself. It usually takes a few minutes.
          </p>
        </div>
      ) : status !== "completed" && !responses.length ? (
        <div className="mt-8 rounded-lg border border-brand-stone bg-brand-cream p-6">
          <p className="font-medium">We couldn't finish this scan.</p>
          <p className="mt-1 text-sm text-brand-walnut">Please try again later, or sign up to track your branch every week.</p>
        </div>
      ) : null}

      {responses.length ? (
        <>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-brand-stone bg-white p-6 shadow-card">
              <p className="text-sm text-brand-slate">Visibility</p>
              <p className="mt-1 font-serif text-6xl tabular-nums">{fmt.pct(branch.visibility)}</p>
              <p className="mt-2 text-sm text-brand-walnut">
                Named in {branch.mentions} of {branch.responses} answers{branch.position !== null ? `, at ${fmt.position(branch.position)} on average` : ""}.
              </p>
              <p className="mt-2 text-xs text-brand-slate">A small sample: one run of each question on {[...new Set(responses.map((r) => engineLabel(r.engine)))].join(" and ")}.</p>
            </div>
            <div className="rounded-lg border border-brand-stone bg-white p-6 shadow-card">
              <p className="text-sm text-brand-slate">Named instead</p>
              {top.length ? (
                <ol className="mt-3 space-y-2">
                  {top.map((c, i) => (
                    <li key={c.name} className="flex items-baseline gap-3">
                      <span className="text-brand-slate">{i + 1}</span>
                      <span className="flex-1 font-medium">{c.name}</span>
                      <span className="tabular-nums text-sm text-brand-walnut">
                        {c.m.mentions} of {c.m.responses} answers
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-sm text-brand-walnut">{inFlight ? "Waiting for answers." : "No other agents were named."}</p>
              )}
            </div>
          </div>

          {first ? (
            <div className="mt-10 rounded-lg border border-brand-stone bg-white p-6 shadow-card">
              <p className="text-sm text-brand-terracotta">Your first fix</p>
              <h2 className="mt-1 text-2xl">{first.title}</h2>
              <p className="mt-2 text-brand-walnut">{first.why}</p>
              {first.asset_text ? (
                <>
                  <p className="mt-4 text-xs text-brand-slate">{COPY.draftLabel}</p>
                  <pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-brand-cream p-4 text-xs">{first.asset_text}</pre>
                </>
              ) : null}
            </div>
          ) : null}

          {locked > 0 || !inFlight ? (
            <div className="mt-6 flex flex-wrap items-center gap-4 rounded-lg bg-brand-hedge p-6 text-brand-bone">
              <Lock size={20} strokeWidth={1.5} />
              <p className="flex-1">
                {locked > 0 ? `${locked} more fix${locked === 1 ? "" : "es"} found for your branch. ` : ""}
                Track every week across four assistants, with every answer and fix.
              </p>
              <Link href="/login?next=/onboarding" className={buttonClasses("accent")}>Keep these results</Link>
            </div>
          ) : null}

          {evidence.length ? (
            <div className="mt-12">
              <h2 className="text-2xl">The answers behind these numbers</h2>
              <div className="mt-4 space-y-4">
                {evidence.map((r) => {
                  const names = (namesByResult.get(r.id) ?? []).filter(Boolean);
                  const named = responses.find((x) => x.id === r.id)?.agents.some((a) => a.subjectKey === BRANCH_KEY && a.confidence === "high");
                  return (
                    <div key={r.id} className="rounded-lg border border-brand-stone bg-white p-4 text-sm">
                      <p className="text-brand-slate">
                        {engineLabel(r.engine)} · "{r.prompt_text}" · {named ? "You were named" : "You weren't named"}
                      </p>
                      {names.length ? <p className="mt-1">Named: {names.join(", ")}</p> : null}
                      <p className="mt-2 text-brand-walnut">
                        {(r.answer_text ?? "").slice(0, 400)}
                        {(r.answer_text?.length ?? 0) > 400 ? "…" : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <p className="mt-12 text-xs text-brand-slate">{COPY.noPromise}</p>
    </section>
  );
}

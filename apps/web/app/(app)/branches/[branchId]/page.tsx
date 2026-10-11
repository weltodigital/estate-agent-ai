import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getScanSettings } from "@privett/core";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/dashboard/metric-card";
import { VoiceRanking } from "@/components/dashboard/ranking-bars";
import { LiveScanPanel } from "@/components/scan/live-scan-panel";
import { requireBranch } from "@/lib/auth";
import {
  loadBranchResults,
  loadCompetitors,
  loadRecentRuns,
  loadRecommendations,
  loadReferrals,
  toResponses,
} from "@/lib/data/branch-data";
import { loadChanges } from "@/lib/data/changes-loader";
import { buildCards } from "@/lib/data/overview";
import { buildHeadline, buildSummary, EFFORT_LABEL, firstSentence, relativeTime } from "@/lib/data/summary";
import { COPY } from "@/lib/copy";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { HelpLink } from "@/components/ui/help-link";

export const metadata = { title: "Overview" };

const DAY = 86_400_000;
const WINDOW_DAYS = 30;
const SPARK_WEEKS = 8;

// One screen an agent can read standing up (UX spec 1): the answer, the four
// numbers with context, who AI recommends, what to fix, what changed.
// Every figure comes from core metric functions over stored answers.
export default async function BranchOverviewPage({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const { branch, plan } = await requireBranch(branchId);
  const base = `/branches/${branch.id}`;
  const now = Date.now();
  const from = new Date(now - WINDOW_DAYS * DAY).toISOString();
  const prevFrom = new Date(now - 2 * WINDOW_DAYS * DAY).toISOString();
  const sparkFrom = new Date(now - SPARK_WEEKS * 7 * DAY).toISOString();
  const loadFrom = prevFrom < sparkFrom ? prevFrom : sparkFrom;
  const { lowSampleThreshold } = getScanSettings();

  const [rows, competitors, runs, recs, referrals] = await Promise.all([
    loadBranchResults(branch.id, loadFrom),
    loadCompetitors(branch.id),
    loadRecentRuns(branch.id, 10),
    loadRecommendations(branch.id),
    loadReferrals(branch.id, from),
  ]);
  const changes = await loadChanges(branch.id, competitors, recs);

  const latestRun = runs[0] ?? null;
  const scanning = latestRun && (latestRun.status === "queued" || latestRun.status === "running") ? latestRun : null;
  const finishedRuns = runs.filter((r) => r.status === "completed" || r.status === "budget_exceeded");
  const lastFinished = finishedRuns[0] ?? null;
  const nextScan =
    plan.paid && latestRun ? new Date(new Date(latestRun.created_at).getTime() + plan.limits.scanIntervalDays * DAY).toISOString() : null;

  const visible = competitors.filter((c) => c.status !== "hidden");
  const responses = toResponses(rows);
  const summary = buildSummary({
    responses,
    competitors: visible.map((c) => ({ id: c.id, name: c.name })),
    from,
    prevFrom,
    lowSampleThreshold,
  });

  if (!summary.answers) {
    return (
      <div className="space-y-6">
        {scanning ? (
          <Card>
            <CardBody>
              <LiveScanPanel runId={scanning.id} agencyName={branch.name} />
            </CardBody>
          </Card>
        ) : null}
        <EmptyState
          title={scanning ? "Your first scan is running" : "No scan results yet"}
          action={
            scanning ? null : (
              <Link href={`${base}/settings`} className="text-sm font-medium text-brand underline-offset-2 hover:underline">
                Check your questions
              </Link>
            )
          }
        >
          {scanning
            ? "Results appear here as the answers come in, usually within a few minutes."
            : `${COPY.emptyScans} Use Scan now above to start one.`}
        </EmptyState>
      </div>
    );
  }

  const headline = buildHeadline(summary, { firstScan: finishedRuns.length <= 1, days: WINDOW_DAYS });
  const { cards } = buildCards({
    responses,
    current: { from },
    previous: { from: prevFrom, to: from },
    trendFilter: { from: sparkFrom },
    competitors: visible.map((c) => ({ key: c.id, name: c.name })),
    lowSampleThreshold,
  });
  const openFixes = recs.filter((r) => r.status === "todo" && r.verified_result !== "resolved");
  const nextFixes = openFixes.slice(0, 3);
  const evidenceHref = (k: string) => `${base}/prompts${k === "visibility" || k === "shareOfVoice" ? "" : "?mentioned=yes"}#answers`;

  return (
    <div className="space-y-8">
      {scanning ? (
        <Card>
          <CardBody>
            <LiveScanPanel runId={scanning.id} agencyName={branch.name} />
          </CardBody>
        </Card>
      ) : null}

      {/* 1a. The answer */}
      <section aria-labelledby="headline">
        <p id="headline" className="max-w-4xl text-[20px] font-semibold leading-[28px] tracking-[-0.015em] text-ink sm:text-title">
          {headline.map((p, i) =>
            p.strong ? (
              <span key={i} className="text-brand">
                {p.text}
              </span>
            ) : (
              <span key={i}>{p.text}</span>
            ),
          )}
        </p>
        <p className="mt-2 text-small text-ink-muted">
          {lastFinished?.finished_at ? (
            <>
              Last scanned{" "}
              <time dateTime={lastFinished.finished_at} title={formatDateTime(lastFinished.finished_at)}>
                {relativeTime(lastFinished.finished_at)}
              </time>
              {" · "}
            </>
          ) : null}
          {nextScan ? (
            <>
              next scan <time dateTime={nextScan}>{formatDate(nextScan)}</time>
              {" · "}
            </>
          ) : null}
          based on <span className="font-mono tabular-nums">{summary.answers}</span> answers in the last {WINDOW_DAYS} days
          {" · "}
          <HelpLink section="numbers" label="How we work this out" />
        </p>
      </section>

      {/* 1b. The four numbers, with context */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-label="Headline numbers">
        {cards.map((c) => (
          <MetricCard key={c.key} card={c} evidenceHref={evidenceHref(c.key)} days={WINDOW_DAYS} />
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* 1c. Who AI recommends */}
        <Card className="min-w-0 lg:col-span-3">
          <CardBody>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="flex flex-wrap items-baseline gap-x-3 text-heading text-ink">
                Who AI recommends in {branch.town} <HelpLink section="recommends" />
              </h2>
              <p className="text-small text-ink-muted">
                You&apos;re <span className="font-mono font-medium text-ink tabular-nums">#{summary.voiceRank}</span> of{" "}
                <span className="font-mono tabular-nums">{summary.voice.length}</span>
              </p>
            </div>
            <p className="mt-0.5 text-small text-ink-muted">Share of all agent mentions in the last {WINDOW_DAYS} days.</p>
            <div className="mt-4">
              <VoiceRanking rows={summary.voice} youLabel={branch.name} hrefFor={(id) => `${base}/competitors?focus=${id}`} />
            </div>
          </CardBody>
        </Card>

        {/* 1d. Your next three fixes */}
        <Card className="min-w-0 lg:col-span-2">
          <CardBody>
            <h2 className="flex flex-wrap items-baseline gap-x-3 text-heading text-ink">
              Your next fixes <HelpLink section="fixes" label="How fixes work" />
            </h2>
            {nextFixes.length ? (
              <ol className="mt-3 space-y-3">
                {nextFixes.map((f) => (
                  <li key={f.id} className="rounded-md border border-hairline p-3">
                    <p className="font-medium text-ink">{f.title}</p>
                    <p className="mt-0.5 text-small text-ink-muted">{firstSentence(f.why)}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-small text-ink-muted">{EFFORT_LABEL[f.effort]}</span>
                      <Link
                        href={`${base}/fixes#${f.id}`}
                        className="ring-brand-focus inline-flex min-h-11 items-center rounded-md border border-hairline bg-surface-raised px-4 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-brand-tint active:scale-[0.97]"
                      >
                        Start
                      </Link>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-small text-ink-muted">Nothing to fix right now. We check again after every scan.</p>
            )}
            {openFixes.length ? (
              <Link href={`${base}/fixes`} className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand hover:underline">
                See all {openFixes.length} fixes <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
              </Link>
            ) : null}
          </CardBody>
        </Card>
      </div>

      {/* 1e. What changed */}
      <Card>
        <CardBody>
          <h2 className="flex flex-wrap items-baseline gap-x-3 text-heading text-ink">
            What changed since your last scan <HelpLink section="scan" label="How scans work" />
          </h2>
          {changes === null ? (
            <p className="mt-2 text-small text-ink-muted">Changes appear after your second scan.</p>
          ) : changes.length ? (
            <ul className="mt-3 divide-y divide-hairline">
              {changes.map((c, i) => (
                <li key={i} className="flex items-start gap-3 py-2.5 text-sm text-ink">
                  <span
                    className={cn(
                      "mt-0.5 w-3 shrink-0 font-mono text-data",
                      c.tone === "up" ? "text-up" : c.tone === "down" ? "text-down" : "text-ink-muted",
                    )}
                    aria-hidden="true"
                  >
                    {c.tone === "up" ? "▲" : c.tone === "down" ? "▼" : "•"}
                  </span>
                  <span className="min-w-0">{c.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-small text-ink-muted">No changes between your last two scans.</p>
          )}
        </CardBody>
      </Card>

      {/* Website visits from AI, once the snippet is sending them */}
      {referrals.length ? (
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-ink">
              <span className="font-mono font-medium tabular-nums">{referrals.length}</span> visits to your website came from AI assistants in
              the last {WINDOW_DAYS} days.
            </p>
            <Link href={`${base}/referrals`} className="inline-flex min-h-11 items-center text-sm font-medium text-brand hover:underline">
              See visits
            </Link>
          </CardBody>
        </Card>
      ) : null}

      <p className="text-small text-ink-muted">
        Every number links to the answers behind it.{" "}
        <Link href={`${base}/prompts`} className="font-medium text-brand hover:underline">
          Read the answers
        </Link>
        . {COPY.noPromise}
      </p>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getScanSettings } from "@privett/core";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ScanProgress } from "@/components/dashboard/scan-status";
import { requireBranch } from "@/lib/auth";
import {
  loadBranchResults,
  loadCompetitors,
  loadRecentRuns,
  loadRecommendations,
  loadReferrals,
  toResponses,
} from "@/lib/data/branch-data";
import { buildSummary, EFFORT_LABEL, firstSentence, ordinal, outOfTen } from "@/lib/data/summary";
import { COPY } from "@/lib/copy";
import { cn, formatDate } from "@/lib/utils";

export const metadata = { title: "Overview" };

const DAY = 86_400_000;
const WINDOW_DAYS = 30;

// The answer first, then who beats you, what to fix and where you're missing.
// Every figure is the same core metric the Evidence pages show in full.
export default async function BranchOverviewPage({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const { branch } = await requireBranch(branchId);
  const base = `/branches/${branch.id}`;
  const from = new Date(Date.now() - WINDOW_DAYS * DAY).toISOString();
  const prevFrom = new Date(Date.now() - 2 * WINDOW_DAYS * DAY).toISOString();

  const [rows, competitors, runs, recs, referrals] = await Promise.all([
    loadBranchResults(branch.id, prevFrom),
    loadCompetitors(branch.id),
    loadRecentRuns(branch.id, 1),
    loadRecommendations(branch.id),
    loadReferrals(branch.id, from),
  ]);
  const latestRun = runs[0] ?? null;
  const scanning = latestRun && (latestRun.status === "queued" || latestRun.status === "running");

  const summary = buildSummary({
    responses: toResponses(rows),
    competitors: competitors.filter((c) => c.status !== "hidden").map((c) => ({ id: c.id, name: c.name })),
    from,
    prevFrom,
    lowSampleThreshold: getScanSettings().lowSampleThreshold,
  });

  if (!summary.answers) {
    return (
      <div className="space-y-6">
        {latestRun ? (
          <Card>
            <CardBody>
              <ScanProgress run={latestRun} />
            </CardBody>
          </Card>
        ) : null}
        <EmptyState
          title={scanning ? "Your first scan is running" : "No scan results yet"}
          action={
            scanning ? null : (
              <Link href={`${base}/settings`} className="text-sm font-medium text-brand underline-offset-2 hover:underline">
                Check your questions and run a scan
              </Link>
            )
          }
        >
          {scanning ? "Results appear here as the answers come in, usually within a few minutes." : COPY.emptyScans}
        </EmptyState>
      </div>
    );
  }

  const now10 = outOfTen(summary.visibility);
  const prev10 = outOfTen(summary.previousVisibility);
  const fixes = recs.filter((r) => r.status === "todo").slice(0, 3);
  const topScore = Math.max(...summary.ranking.map((r) => r.visibility), 1);
  const engines = summary.byEngine.filter((e) => e.answers > 0);
  const latestDate = latestRun?.finished_at ?? rows.at(-1)?.created_at ?? null;

  return (
    <div className="space-y-8">
      {scanning && latestRun ? (
        <Card>
          <CardBody>
            <ScanProgress run={latestRun} />
          </CardBody>
        </Card>
      ) : null}

      {/* 1. The answer */}
      <section>
        <p className="text-[22px] leading-[30px] text-ink md:text-[26px] md:leading-[34px]">
          When people ask AI for an estate agent in {branch.town}, you&apos;re named in{" "}
          <span className="font-semibold">
            {now10} out of 10
          </span>{" "}
          answers.
        </p>
        <p className="mt-2 text-ink-muted">
          {prev10 !== null && now10 !== null && prev10 !== now10 ? (
            <span className={now10 > prev10 ? "text-up" : "text-down"}>
              {now10 > prev10 ? "▲ Up" : "▼ Down"} from {prev10} in 10 the month before.{" "}
            </span>
          ) : null}
          {summary.usualPlace ? `When AI names you, you're usually listed ${ordinal(summary.usualPlace)}. ` : null}
          {summary.describedAs.length ? `It describes you as ${listWords(summary.describedAs)}.` : null}
        </p>
        {summary.lowSample ? (
          <p className="mt-2 text-small text-warn">Based on a small number of answers so far, so expect this to move.</p>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 2. Who AI recommends */}
        <Card>
          <CardBody>
            <h2 className="text-heading text-ink">Who AI names most</h2>
            <p className="mt-0.5 text-small text-ink-muted">Share of answers that name each agent.</p>
            <ul className="mt-4 space-y-2.5">
              {summary.ranking.map((r) => (
                <li key={r.name} className="grid grid-cols-[minmax(0,9rem)_1fr_3rem] items-center gap-3 text-small">
                  <span className={cn("truncate", r.isYou ? "font-semibold text-ink" : "text-ink-muted")}>
                    {r.isYou ? "You" : r.name}
                  </span>
                  <span className="h-2.5 rounded-sm bg-rival-soft">
                    <span
                      className={cn("block h-full rounded-sm", r.isYou ? "bg-brand" : "bg-rival")}
                      style={{ width: `${Math.max(2, (r.visibility / topScore) * 100)}%` }}
                    />
                  </span>
                  <span className={cn("text-right font-mono text-data", r.isYou ? "text-ink" : "text-ink-muted")}>
                    {Math.round(r.visibility)}%
                  </span>
                </li>
              ))}
            </ul>
            {engines.length > 1 ? (
              <p className="mt-4 text-small text-ink-muted">
                By assistant:{" "}
                {engines.map((e, i) => (
                  <span key={e.engine}>
                    {i ? " · " : ""}
                    {e.label} <span className="font-mono text-ink">{e.visibility === null ? "—" : `${Math.round(e.visibility)}%`}</span>
                  </span>
                ))}
              </p>
            ) : null}
          </CardBody>
        </Card>

        {/* 3. What to fix */}
        <Card>
          <CardBody>
            <h2 className="text-heading text-ink">Your next fixes</h2>
            {fixes.length ? (
              <ol className="mt-3 space-y-3">
                {fixes.map((f, i) => (
                  <li key={f.id} className="flex gap-3">
                    <span className="font-mono text-data text-ink-muted">{i + 1}</span>
                    <div className="min-w-0">
                      <Link href={`${base}/fixes#${f.id}`} className="font-medium text-ink hover:underline">
                        {f.title}
                      </Link>
                      <p className="text-small text-ink-muted">
                        {firstSentence(f.why)} <span className="text-ink-muted">· {EFFORT_LABEL[f.effort]}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-small text-ink-muted">
                Nothing to fix right now. Fixes appear when your answers or website show a clear gap.
              </p>
            )}
            <Link href={`${base}/fixes`} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
              All fixes <ArrowRight size={14} strokeWidth={1.5} />
            </Link>
          </CardBody>
        </Card>
      </div>

      {/* 4. Where you're missing */}
      {summary.missing.length ? (
        <Card>
          <CardBody>
            <h2 className="text-heading text-ink">Questions where you&apos;re missing</h2>
            <p className="mt-0.5 text-small text-ink-muted">What people ask AI, and how often it names you.</p>
            <ul className="mt-3 divide-y divide-hairline">
              {summary.missing.map((m) => (
                <li key={m.prompt}>
                  <Link
                    href={`${base}/prompts?prompt=${encodeURIComponent(m.prompt)}#answers`}
                    className="flex items-center justify-between gap-4 py-2.5 hover:bg-surface-sunken/50"
                  >
                    <span className="text-ink">&ldquo;{m.prompt}&rdquo;</span>
                    <span className="shrink-0 text-small text-ink-muted">
                      {m.named ? `named in ${m.named} of ${m.of}` : `never named (${m.of} answers)`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      {/* 5. Website visits from AI, once the snippet is installed */}
      {referrals.length ? (
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-ink">
              <span className="font-mono font-medium">{referrals.length}</span> visits to your website came from AI assistants in the last {WINDOW_DAYS} days.
            </p>
            <Link href={`${base}/referrals`} className="text-sm font-medium text-brand hover:underline">
              See visits
            </Link>
          </CardBody>
        </Card>
      ) : null}

      <p className="text-small text-ink-muted">
        Based on {summary.answers} AI answers from the last {WINDOW_DAYS} days
        {latestDate ? `, latest scan ${formatDate(latestDate)}` : ""}.{" "}
        <Link href={`${base}/evidence`} className="font-medium text-brand hover:underline">
          See all the evidence
        </Link>
        . {COPY.noPromise}
      </p>
    </div>
  );
}

function listWords(words: string[]): string {
  return words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words.at(-1)}` : (words[0] ?? "");
}

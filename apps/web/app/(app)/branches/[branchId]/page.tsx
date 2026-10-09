import Link from "next/link";
import { engineLabel, filterResponses, fmt, getScanSettings, weekStart } from "@privett/core";
import { CardBody, Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ScanProgress } from "@/components/dashboard/scan-status";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { requireBranch } from "@/lib/auth";
import {
  loadAnswerTexts,
  loadBranchResults,
  loadCompetitors,
  loadLatestGbp,
  loadRecentRuns,
  loadRecommendations,
  toResponses,
} from "@/lib/data/branch-data";
import { extractSnippet } from "@/lib/data/aggregate";
import { filterQuery, metricFilter, parseFilters, type SearchParams } from "@/lib/data/filters";
import { buildCards, METRIC_KEYS, perEngine, trendSeries, type MetricKey, type TrendPoint } from "@/lib/data/overview";
import { COPY } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { plainText } from "@/lib/data/plain-text";

export const metadata = { title: "Overview" };

const TREND_WEEKS = 12;

export default async function BranchOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { branchId } = await params;
  const { branch } = await requireBranch(branchId);
  const filters = parseFilters(await searchParams);
  const { lowSampleThreshold } = getScanSettings();
  const base = `/branches/${branch.id}`;

  // Load enough history for the previous period and a 12-week trend.
  const trendFrom = new Date(Date.now() - TREND_WEEKS * 7 * 86_400_000).toISOString();
  const loadFrom = trendFrom < filters.prevFrom ? trendFrom : filters.prevFrom;

  const [rows, competitors, runs, recs] = await Promise.all([
    loadBranchResults(branch.id, loadFrom),
    loadCompetitors(branch.id),
    loadRecentRuns(branch.id, 1),
    loadRecommendations(branch.id),
  ]);
  const responses = toResponses(rows);
  const visibleCompetitors = competitors.filter((c) => c.status !== "hidden").map((c) => ({ key: c.id, name: c.name }));
  const current = metricFilter(filters);
  const previous = metricFilter(filters, "previous");
  const trendFilter = { engines: current.engines, intentGroups: current.intentGroups, from: trendFrom };
  const latestRun = runs[0] ?? null;

  if (!rows.length) {
    return (
      <div className="space-y-6">
        {latestRun ? (
          <Card>
            <CardHeader title="Latest scan" />
            <CardBody>
              <ScanProgress run={latestRun} />
            </CardBody>
          </Card>
        ) : null}
        <EmptyState
          title="No scan results yet"
          action={
            <Link href={`${base}/settings`} className="text-sm font-medium text-brand underline-offset-2 hover:underline">
              Check your prompts and run a scan
            </Link>
          }
        >
          {COPY.emptyScans}
        </EmptyState>
      </div>
    );
  }

  const { cards, top } = buildCards({ responses, current, previous, trendFilter, competitors: visibleCompetitors, lowSampleThreshold });
  const branchMetrics = cards[0]!.metrics;
  const engines = perEngine(responses, current, lowSampleThreshold);

  const trendData = Object.fromEntries(
    METRIC_KEYS.map((k) => [k, trendSeries(responses, top, trendFilter, k)]),
  ) as Record<MetricKey, TrendPoint[]>;
  const fixes = recs
    .filter((r) => r.status === "done" && r.completed_at)
    .map((r) => ({ week: weekStart(r.completed_at!), title: r.title }));

  // "How AI describes you": a snippet per top descriptor, linked to its answer.
  const descriptorSources = new Map<string, string>();
  for (const r of rows) {
    if (!branchMetrics.mentionResponseIds.includes(r.id)) continue;
    const m = r.agent_mentions.find((a) => a.is_branch && a.match_confidence === "high");
    for (const d of m?.descriptors ?? []) {
      const k = d.trim().toLowerCase();
      if (k && !descriptorSources.has(k)) descriptorSources.set(k, r.id);
    }
  }
  const topDescriptors = branchMetrics.topDescriptors.slice(0, 6);
  const texts = await loadAnswerTexts(topDescriptors.map((d) => descriptorSources.get(d.descriptor)).filter((x): x is string => !!x));
  const describe = topDescriptors.map((d) => {
    const id = descriptorSources.get(d.descriptor) ?? null;
    const text = id ? texts.get(id)?.answer_text : null;
    return { ...d, id, snippet: extractSnippet(plainText(text), [d.descriptor, branch.name, ...branch.aliases]) };
  });

  const gbp = await loadLatestGbp(branch.id, top.map((t) => t.key));
  const evidence = (k: MetricKey) =>
    `${base}/prompts${filterQuery(filters, { mentioned: k === "visibility" || k === "shareOfVoice" ? null : "yes" })}#answers`;

  return (
    <div className="space-y-8">
      <FilterBar basePath={base} filters={filters} />

      {latestRun && latestRun.status !== "completed" ? (
        <Card>
          <CardBody>
            <ScanProgress run={latestRun} />
          </CardBody>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Headline metrics">
        {cards.map((c) => (
          <MetricCard key={c.key} card={c} evidenceHref={evidence(c.key)} days={filters.days} />
        ))}
      </section>

      <Card>
        <CardHeader title="Over time" description="Weekly, for you and the three agents AI names most. Dashed lines mark weeks you completed a fix." />
        <CardBody>
          <TrendChart data={trendData} series={["You", ...top.map((t) => t.name)]} fixes={fixes} />
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="By engine" description={`Last ${filters.days} days.`} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-small text-ink-muted">
                <tr>
                  <th className="px-5 py-2 font-medium">Engine</th>
                  <th className="px-3 py-2 text-right font-medium">Visibility</th>
                  <th className="px-3 py-2 text-right font-medium">Position</th>
                  <th className="px-3 py-2 text-right font-medium">Sentiment</th>
                  <th className="px-5 py-2 text-right font-medium">Share of voice</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {engines.map(({ engine, metrics: m }) => (
                  <tr key={engine} className={cn("border-t border-hairline", m.lowSample && "text-ink-muted")}>
                    <td className="px-5 py-2">
                      <Link href={`${base}/prompts${filterQuery(filters, { engine })}#answers`} className="hover:underline">
                        {engineLabel(engine)}
                      </Link>
                      <span className="ml-2 text-small text-ink-muted">{m.responses} responses</span>
                    </td>
                    <td className="px-3 py-2 text-right">{fmt.pct(m.visibility)}</td>
                    <td className="px-3 py-2 text-right">{fmt.position(m.position)}</td>
                    <td className="px-3 py-2 text-right">{fmt.score(m.sentiment)}</td>
                    <td className="px-5 py-2 text-right">{fmt.pct(m.shareOfVoice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="How AI describes you" description="The words assistants use most when they name you." />
          <CardBody>
            {describe.length ? (
              <ul className="space-y-3">
                {describe.map((d) => (
                  <li key={d.descriptor}>
                    <div className="flex items-center gap-2">
                      <Badge>{d.descriptor}</Badge>
                      <span className="text-small font-mono text-ink-muted">{d.count}×</span>
                    </div>
                    {d.snippet && d.id ? (
                      <Link href={`${base}/responses/${d.id}`} className="mt-1 block text-sm text-ink-muted hover:text-ink">
                        “{d.snippet}”
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">No descriptors yet. They appear once AI names you.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Who AI names instead"
          description={`The agents named most in the last ${filters.days} days.`}
          action={
            <Link href={`${base}/competitors${filterQuery(filters)}`} className="text-sm text-brand hover:underline">
              All competitors
            </Link>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-small text-ink-muted">
              <tr>
                <th className="px-5 py-2 font-medium">Agent</th>
                <th className="px-3 py-2 text-right font-medium">Visibility</th>
                <th className="px-3 py-2 text-right font-medium">Position</th>
                <th className="px-3 py-2 text-right font-medium">Share of voice</th>
                <th className="px-5 py-2 text-right font-medium">Google reviews</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr className="border-t border-hairline bg-brand-tint font-medium">
                <td className="px-5 py-2 font-sans">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-signal ring-1 ring-brand/40" aria-hidden="true" />
                    {branch.name} <span className="text-ink-muted">(you)</span>
                  </span>
                </td>
                <td className="px-3 py-2 text-right">{fmt.pct(branchMetrics.visibility)}</td>
                <td className="px-3 py-2 text-right">{fmt.position(branchMetrics.position)}</td>
                <td className="px-3 py-2 text-right">{fmt.pct(branchMetrics.shareOfVoice)}</td>
                <td className="px-5 py-2 text-right">{reviews(gbp.branch)}</td>
              </tr>
              {top.map((t) => (
                <tr key={t.key} className="border-t border-hairline">
                  <td className="px-5 py-2 font-sans">{t.name}</td>
                  <td className="px-3 py-2 text-right">{fmt.pct(t.metrics.visibility)}</td>
                  <td className="px-3 py-2 text-right">{fmt.position(t.metrics.position)}</td>
                  <td className="px-3 py-2 text-right">{fmt.pct(t.metrics.shareOfVoice)}</td>
                  <td className="px-5 py-2 text-right">{reviews(gbp.competitor.get(t.key) ?? null)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-small text-ink-muted">
        {COPY.noPromise} Responses that couldn’t be read are left out of every figure.{" "}
        {branchMetrics.responses} of {filterResponses(responses, current).length} responses in this view were readable.
      </p>
    </div>
  );
}

function reviews(g: { found: boolean; reviewCount: number | null; rating: number | null } | null) {
  if (!g?.found || g.reviewCount === null) return "—";
  return `${g.reviewCount}${g.rating !== null ? ` · ${g.rating.toFixed(1)}★` : ""}`;
}

import Link from "next/link";
import { BRANCH_KEY, computeSubjectMetrics, fmt, fmtPct, fmtPos, getScanSettings, type GoogleBusinessSignal } from "@privett/core";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { requireBranch } from "@/lib/auth";
import { loadBranchResults, loadCompetitors, loadLatestGbp, toResponses } from "@/lib/data/branch-data";
import { metricFilter, parseFilters, type SearchParams } from "@/lib/data/filters";
import { CompetitorsTable, type CompetitorRowData } from "./competitors-table";

export const metadata = { title: "Competitors" };

function reviews(g: GoogleBusinessSignal | null | undefined) {
  if (!g?.found || g.reviewCount === null) return "—";
  return String(g.reviewCount);
}
function rating(g: GoogleBusinessSignal | null | undefined) {
  return g?.found && g.rating !== null ? g.rating.toFixed(1) : "—";
}

export default async function CompetitorsPage({
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
  const [rows, competitors] = await Promise.all([loadBranchResults(branch.id, filters.from), loadCompetitors(branch.id)]);
  const responses = toResponses(rows);
  const filter = metricFilter(filters);
  const gbp = await loadLatestGbp(branch.id, competitors.map((c) => c.id));

  const you = computeSubjectMetrics(responses, BRANCH_KEY, { filter, lowSampleThreshold });
  // Every competitor (hidden ones too) so hide/unhide can move rows instantly.
  const tableRows: CompetitorRowData[] = competitors
    .map((c) => ({ c, m: computeSubjectMetrics(responses, c.id, { filter, lowSampleThreshold }) }))
    .sort((a, b) => (b.m.visibility ?? -1) - (a.m.visibility ?? -1))
    .map(({ c, m }) => ({
      id: c.id,
      name: c.name,
      domain: c.domain,
      status: c.status as CompetitorRowData["status"],
      lowSample: m.lowSample,
      cells: [fmtPct(m.visibility), fmtPos(m.position), fmt.score(m.sentiment), fmtPct(m.shareOfVoice), rating(gbp.competitor.get(c.id)), reviews(gbp.competitor.get(c.id))],
    }));

  // Low-confidence matches, for the agent to check (add an alias in settings
  // if a name really is them or a competitor).
  const nameOf = new Map(competitors.map((c) => [c.id, c.name]));
  const unsure = rows
    .filter((r) => r.created_at >= filters.from)
    .flatMap((r) => r.agent_mentions.filter((m) => m.match_confidence === "low").map((m) => ({ ...m, resultId: r.id, prompt: r.prompt_text })));
  const unsureByName = new Map<string, (typeof unsure)[number] & { count: number }>();
  for (const u of unsure) {
    const k = `${u.agent_name}|${u.is_branch ? "branch" : u.matched_competitor_id}`;
    const e = unsureByName.get(k);
    if (e) e.count += 1;
    else unsureByName.set(k, { ...u, count: 1 });
  }

  const base = `/branches/${branch.id}`;

  return (
    <div className="space-y-8">
      <FilterBar basePath={`${base}/competitors`} filters={filters} />

      <Card>
        <CardHeader
          title="Agents AI names in your area"
          description="Every agent named in answers to your tracked questions. Pin the ones you watch closely; hide any that aren't really competitors."
        />
        {tableRows.length ? (
          <CompetitorsTable
            branchId={branch.id}
            headers={["Visibility", "Position", "Sentiment", "Share of voice", "Google rating", "Reviews"]}
            you={{
              name: branch.name,
              cells: [fmtPct(you.visibility), fmtPos(you.position), fmt.score(you.sentiment), fmtPct(you.shareOfVoice), rating(gbp.branch), reviews(gbp.branch)],
            }}
            rows={tableRows}
          />
        ) : (
          <CardBody>
            <EmptyState title="No competitors yet">Agents named in your scan results appear here automatically.</EmptyState>
          </CardBody>
        )}
        <p className="border-t border-hairline px-5 py-3 text-small text-ink-muted">
          Same definitions as your headline figures, over the same responses. Greyed rows have fewer than {lowSampleThreshold} responses in this view.
        </p>
      </Card>

      {unsureByName.size ? (
        <Card>
          <CardHeader
            title="Names we weren’t sure about"
            description="These partly match you or a competitor, so we haven’t counted them. If a name really is the same agency, add it as an alias in settings."
            action={
              <Link href={`${base}/settings`} className="text-sm text-brand hover:underline">
                Branch settings
              </Link>
            }
          />
          <ul className="divide-y divide-hairline text-sm">
            {[...unsureByName.values()].map((u) => (
              <li key={`${u.agent_name}-${u.resultId}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2">
                <span className="font-medium text-ink">{u.agent_name}</span>
                <span className="text-ink-muted">
                  might be {u.is_branch ? "you" : (nameOf.get(u.matched_competitor_id ?? "") ?? "a competitor")}
                </span>
                <span className="text-small font-mono text-ink-muted">{u.count}×</span>
                <Link href={`${base}/responses/${u.resultId}`} className="ml-auto text-small text-brand hover:underline">
                  See an example
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

    </div>
  );
}

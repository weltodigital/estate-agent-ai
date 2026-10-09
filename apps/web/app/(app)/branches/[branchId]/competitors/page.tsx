import Link from "next/link";
import { BRANCH_KEY, computeSubjectMetrics, fmt, getScanSettings, type GoogleBusinessSignal } from "@privett/core";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { requireBranch } from "@/lib/auth";
import { loadBranchResults, loadCompetitors, loadLatestGbp, toResponses } from "@/lib/data/branch-data";
import { metricFilter, parseFilters, type SearchParams } from "@/lib/data/filters";
import { cn } from "@/lib/utils";
import { setCompetitorStatus } from "./actions";

export const metadata = { title: "Competitors" };

function reviews(g: GoogleBusinessSignal | null | undefined) {
  if (!g?.found || g.reviewCount === null) return "—";
  return String(g.reviewCount);
}
function rating(g: GoogleBusinessSignal | null | undefined) {
  return g?.found && g.rating !== null ? g.rating.toFixed(1) : "—";
}

function StatusButton({ branchId, competitorId, status, children }: { branchId: string; competitorId: string; status: string; children: React.ReactNode }) {
  return (
    <form action={setCompetitorStatus}>
      <input type="hidden" name="branch_id" value={branchId} />
      <input type="hidden" name="competitor_id" value={competitorId} />
      <input type="hidden" name="status" value={status} />
      <button className="ring-brand-focus rounded px-1.5 text-xs text-brand-walnut underline-offset-2 hover:underline">{children}</button>
    </form>
  );
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
  const gbp = await loadLatestGbp(branch.id, competitors.filter((c) => c.status !== "hidden").map((c) => c.id));

  const you = computeSubjectMetrics(responses, BRANCH_KEY, { filter, lowSampleThreshold });
  const visible = competitors
    .filter((c) => c.status !== "hidden")
    .map((c) => ({ ...c, m: computeSubjectMetrics(responses, c.id, { filter, lowSampleThreshold }) }))
    .sort((a, b) => Number(b.status === "pinned") - Number(a.status === "pinned") || (b.m.visibility ?? -1) - (a.m.visibility ?? -1));
  const hidden = competitors.filter((c) => c.status === "hidden");

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
  const cell = "px-3 py-2 text-right";

  return (
    <div className="space-y-8">
      <FilterBar basePath={`${base}/competitors`} filters={filters} />

      <Card>
        <CardHeader
          title="Agents AI names in your area"
          description="Every agent named in answers to your tracked questions. Pin the ones you watch closely; hide any that aren't really competitors."
        />
        {visible.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs text-brand-slate">
                <tr>
                  <th className="px-5 py-2 font-medium">Agent</th>
                  <th className="px-3 py-2 text-right font-medium">Visibility</th>
                  <th className="px-3 py-2 text-right font-medium">Position</th>
                  <th className="px-3 py-2 text-right font-medium">Sentiment</th>
                  <th className="px-3 py-2 text-right font-medium">Share of voice</th>
                  <th className="px-3 py-2 text-right font-medium">Google rating</th>
                  <th className="px-3 py-2 text-right font-medium">Reviews</th>
                  <th className="px-5 py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="tabular-nums">
                <tr className="border-t border-brand-stone bg-brand-cream font-medium">
                  <td className="px-5 py-2">{branch.name} (you)</td>
                  <td className={cell}>{fmt.pct(you.visibility)}</td>
                  <td className={cell}>{fmt.position(you.position)}</td>
                  <td className={cell}>{fmt.score(you.sentiment)}</td>
                  <td className={cell}>{fmt.pct(you.shareOfVoice)}</td>
                  <td className={cell}>{rating(gbp.branch)}</td>
                  <td className={cell}>{reviews(gbp.branch)}</td>
                  <td />
                </tr>
                {visible.map((c) => (
                  <tr key={c.id} className={cn("border-t border-brand-stone", c.m.lowSample && "text-brand-slate")}>
                    <td className="px-5 py-2">
                      <span className="text-brand-ink">{c.name}</span>
                      {c.status === "pinned" ? <Badge className="ml-2">Pinned</Badge> : null}
                      {c.domain ? <span className="block text-xs text-brand-slate">{c.domain}</span> : null}
                    </td>
                    <td className={cell}>{fmt.pct(c.m.visibility)}</td>
                    <td className={cell}>{fmt.position(c.m.position)}</td>
                    <td className={cell}>{fmt.score(c.m.sentiment)}</td>
                    <td className={cell}>{fmt.pct(c.m.shareOfVoice)}</td>
                    <td className={cell}>{rating(gbp.competitor.get(c.id))}</td>
                    <td className={cell}>{reviews(gbp.competitor.get(c.id))}</td>
                    <td className="px-5 py-2">
                      <div className="flex justify-end gap-1">
                        {c.status === "pinned" ? (
                          <StatusButton branchId={branch.id} competitorId={c.id} status="discovered">Unpin</StatusButton>
                        ) : (
                          <StatusButton branchId={branch.id} competitorId={c.id} status="pinned">Pin</StatusButton>
                        )}
                        <StatusButton branchId={branch.id} competitorId={c.id} status="hidden">Hide</StatusButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <CardBody>
            <EmptyState title="No competitors yet">Agents named in your scan results appear here automatically.</EmptyState>
          </CardBody>
        )}
        <p className="border-t border-brand-stone px-5 py-3 text-xs text-brand-slate">
          Same definitions as your headline figures, over the same responses. Greyed rows have fewer than {lowSampleThreshold} responses in this view.
        </p>
      </Card>

      {unsureByName.size ? (
        <Card>
          <CardHeader
            title="Names we weren’t sure about"
            description="These partly match you or a competitor, so we haven’t counted them. If a name really is the same agency, add it as an alias in settings."
            action={
              <Link href={`${base}/settings`} className="text-sm text-brand-terracotta hover:underline">
                Branch settings
              </Link>
            }
          />
          <ul className="divide-y divide-brand-stone text-sm">
            {[...unsureByName.values()].map((u) => (
              <li key={`${u.agent_name}-${u.resultId}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2">
                <span className="font-medium text-brand-ink">{u.agent_name}</span>
                <span className="text-brand-walnut">
                  might be {u.is_branch ? "you" : (nameOf.get(u.matched_competitor_id ?? "") ?? "a competitor")}
                </span>
                <span className="text-xs tabular-nums text-brand-slate">{u.count}×</span>
                <Link href={`${base}/responses/${u.resultId}`} className="ml-auto text-xs text-brand-terracotta hover:underline">
                  See an example
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {hidden.length ? (
        <details className="rounded-lg border border-brand-stone bg-white">
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-brand-ink">Hidden ({hidden.length})</summary>
          <ul className="divide-y divide-brand-stone border-t border-brand-stone text-sm">
            {hidden.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-5 py-2">
                <span className="text-brand-walnut">{c.name}</span>
                <StatusButton branchId={branch.id} competitorId={c.id} status="discovered">Unhide</StatusButton>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

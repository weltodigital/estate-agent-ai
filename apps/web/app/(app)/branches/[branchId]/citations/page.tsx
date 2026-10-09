import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { requireBranch } from "@/lib/auth";
import { citationStats, isCitationGap } from "@/lib/data/aggregate";
import { loadBranchResults, loadCitations, loadCompetitors } from "@/lib/data/branch-data";
import { parseFilters, type SearchParams } from "@/lib/data/filters";
import { cn } from "@/lib/utils";

export const metadata = { title: "Citations" };

export default async function CitationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { branchId } = await params;
  const { branch } = await requireBranch(branchId);
  const filters = parseFilters(await searchParams);
  const [rows, competitors] = await Promise.all([loadBranchResults(branch.id, filters.from), loadCompetitors(branch.id)]);
  const scoped = rows.filter(
    (r) => (!filters.engine || r.engine === filters.engine) && (!filters.intent || r.intent_group === filters.intent),
  );
  const citations = await loadCitations(branch.id, new Set(scoped.map((r) => r.id)));
  const hidden = new Set(competitors.filter((c) => c.status === "hidden").map((c) => c.id));
  const names = new Map(competitors.map((c) => [c.id, c.name]));

  const named = new Map(
    scoped.map((r) => [
      r.id,
      {
        branch: r.agent_mentions.some((m) => m.is_branch && m.match_confidence === "high"),
        competitorIds: r.agent_mentions
          .filter((m) => m.matched_competitor_id && m.match_confidence === "high" && !hidden.has(m.matched_competitor_id))
          .map((m) => m.matched_competitor_id!),
      },
    ]),
  );
  const stats = citationStats(
    citations.map((c) => ({ scanResultId: c.scan_result_id, domain: c.domain, isOwnDomain: c.is_own_domain, competitorId: c.competitor_id && !hidden.has(c.competitor_id) ? c.competitor_id : null })),
    named,
  );
  const gaps = stats.filter(isCitationGap);
  const base = `/branches/${branch.id}`;

  return (
    <div className="space-y-8">
      <FilterBar basePath={`${base}/citations`} filters={filters} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-xs text-brand-slate">Sites cited</p>
            <p className="text-3xl font-medium tabular-nums text-brand-ink">{stats.length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs text-brand-slate">Sites that cite you</p>
            <p className="text-3xl font-medium tabular-nums text-brand-ink">{stats.filter((s) => s.citesBranch).length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs text-brand-slate">Cite competitors but not you</p>
            <p className="text-3xl font-medium tabular-nums text-brand-terracotta">{gaps.length}</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Where AI gets its information"
          description={`Sites cited in answers about agents in ${branch.town}. Highlighted rows feature competitors but never you: they feed your fixes.`}
          action={
            <Link href={`${base}/fixes`} className="text-sm text-brand-terracotta hover:underline">
              See fixes
            </Link>
          }
        />
        {stats.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-brand-slate">
                <tr>
                  <th className="px-5 py-2 font-medium">Site</th>
                  <th className="px-3 py-2 text-right font-medium">Answers citing it</th>
                  <th className="px-3 py-2 font-medium">Cites you</th>
                  <th className="px-5 py-2 font-medium">Competitors alongside</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => {
                  const gap = isCitationGap(s);
                  return (
                    <tr key={s.domain} className={cn("border-t border-brand-stone align-top", gap && "bg-brand-cream")}>
                      <td className="px-5 py-2">
                        <Link href={`${base}/responses/${s.sampleResultId}`} className="text-brand-ink hover:underline">
                          {s.domain}
                        </Link>
                        {gap ? <Badge tone="warn" className="ml-2">Gap</Badge> : null}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.responses}</td>
                      <td className="px-3 py-2">{s.citesBranch ? <Badge tone="good">Yes</Badge> : <span className="text-brand-slate">No</span>}</td>
                      <td className="px-5 py-2 text-xs text-brand-walnut">
                        {s.competitorIds.length
                          ? s.competitorIds.slice(0, 4).map((id) => names.get(id) ?? "Unknown").join(", ") + (s.competitorIds.length > 4 ? ` and ${s.competitorIds.length - 4} more` : "")
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <CardBody>
            <EmptyState title="No citations in this period">Some assistants answer without citing sources. Try a longer period or another engine.</EmptyState>
          </CardBody>
        )}
      </Card>
    </div>
  );
}

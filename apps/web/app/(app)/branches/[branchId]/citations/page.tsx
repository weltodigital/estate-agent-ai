import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { requireBranch } from "@/lib/auth";
import { attributeCitations, isCitationGap, normaliseAgentName } from "@privett/core";
import { loadBranchResults, loadCitations, loadCompetitors } from "@/lib/data/branch-data";
import { parseFilters, type SearchParams } from "@/lib/data/filters";
import { cn } from "@/lib/utils";

export const metadata = { title: "Sources" };

function listNames(names: string[], max = 4): string {
  if (names.length <= max) return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? "");
  return `${names.slice(0, max).join(", ")} and ${names.length - max} more`;
}



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
  // Same attribution as the fix rules (packages/core/src/citations.ts).
  const places = [branch.town, ...branch.areas];
  const stats = attributeCitations(
    citations.map((c) => ({ resultId: c.scan_result_id, url: c.url, domain: c.domain, isOwnDomain: c.is_own_domain })),
    named,
    { normalisedNames: [branch.name, ...branch.aliases].map((n) => normaliseAgentName(n, places)), domain: branch.domain },
    competitors
      .filter((c) => !hidden.has(c.id))
      .map((c) => ({ id: c.id, normalisedName: normaliseAgentName(c.name, places), domain: c.domain })),
  );
  const gaps = stats.filter(isCitationGap);
  const totalAnswers = new Set(citations.map((c) => c.scan_result_id)).size;
  const base = `/branches/${branch.id}`;

  return (
    <div className="space-y-8">
      <FilterBar basePath={`${base}/citations`} filters={filters} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-label uppercase text-ink-muted">Sites AI used</p>
            <p className="font-mono text-metric text-ink">{stats.length}</p>
            <p className="mt-1 text-small text-ink-muted">Websites cited in {totalAnswers} answers about agents in {branch.town}.</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-label uppercase text-ink-muted">With a page about you</p>
            <p className="font-mono text-metric text-ink">{stats.filter((s) => s.citesBranch).length}</p>
            <p className="mt-1 text-small text-ink-muted">Your site, or a profile or listing that names you.</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-label uppercase text-ink-muted">Gaps</p>
            <p className="font-mono text-metric text-ink">{gaps.length}</p>
            <p className="mt-1 text-small text-ink-muted">Other sites AI used for competitors, with nothing about you.</p>
          </CardBody>
        </Card>
      </div>


      <Card>
        <CardHeader
          title="Where AI gets its information"
          description={`Sites cited in answers about agents in ${branch.town}. Gaps are third-party sites cited for competitors but with no page about you: they feed your fixes.`}
          action={
            <Link href={`${base}/fixes`} className="text-sm text-brand hover:underline">
              See fixes
            </Link>
          }
        />
        {stats.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-small text-ink-muted">
                <tr>
                  <th className="px-5 py-2 font-medium">Site</th>
                  <th className="px-3 py-2 text-right font-medium">Answers citing it</th>
                  <th className="px-3 py-2 font-medium">Cites you</th>
                  <th className="px-5 py-2 font-medium">Pages about</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => {
                  const gap = isCitationGap(s);
                  return (
                    <tr key={s.domain} className={cn("border-t border-hairline align-top", gap && "bg-surface-sunken")}>
                      <td className="px-5 py-2">
                        <Link href={`${base}/responses/${s.sampleResultId}`} className="text-ink hover:underline">
                          {s.domain}
                        </Link>
                        {gap ? <Badge tone="warn" className="ml-2">Gap</Badge> : null}
                        {s.isAgentSite ? <Badge className="ml-2">Agency site</Badge> : null}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{s.responses}</td>
                      <td className="px-3 py-2">{s.citesBranch ? <Badge tone="good">Yes</Badge> : <span className="text-ink-muted">No</span>}</td>
                      <td className="px-5 py-2 text-small text-ink-muted">
                        {(() => {
                          const about = [...(s.citesBranch ? [`${branch.name} (you)`] : []), ...s.aboutIds.map((id) => names.get(id) ?? "Unknown")];
                          return about.length ? listNames(about) : "General pages (no single agent)";
                        })()}
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

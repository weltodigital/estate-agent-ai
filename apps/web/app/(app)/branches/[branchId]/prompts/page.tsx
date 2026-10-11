import Link from "next/link";
import { BRANCH_KEY, computeSubjectMetrics, ENGINE_IDS, engineLabel, filterResponses, type MetricResponse } from "@privett/core";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { AnswerCard } from "@/components/answers/answer-card";
import { HeatGrid, type HeatRow } from "@/components/answers/heat-grid";
import { loadAnswerDetails, loadCitationUrls, loadRunStrips } from "@/components/answers/data";
import { runKey } from "@/lib/data/answers";
import { requireBranch } from "@/lib/auth";
import { loadActivePrompts, loadBranchResults, toResponses } from "@/lib/data/branch-data";
import { filterQuery, metricFilter, parseFilters, type SearchParams } from "@/lib/data/filters";
import { cn } from "@/lib/utils";
import { HelpLink } from "@/components/ui/help-link";

export const metadata = { title: "Answers" };

const PAGE_SIZE = 20;
const GRID_DAYS = 30;
const DAY = 86_400_000;

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function rate(responses: MetricResponse[], from: string, to: string | undefined, engine?: string) {
  const m = computeSubjectMetrics(responses, BRANCH_KEY, { filter: { from, to, engines: engine ? [engine] : undefined } });
  return { pct: m.visibility, answers: m.responses };
}

export default async function AnswersPage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { branchId } = await params;
  const sp = await searchParams;
  const { branch } = await requireBranch(branchId);
  const filters = parseFilters(sp);
  const base = `/branches/${branch.id}`;
  const promptFilter = first(sp.prompt) ?? null;
  const engineParam = first(sp.engine) ?? null;
  const mentioned = first(sp.mentioned) === "yes" ? "yes" : first(sp.mentioned) === "no" ? "no" : null;
  const sort = first(sp.sort) === "change" ? "change" : "visibility";
  const page = Math.max(1, Number(first(sp.page)) || 1);

  // The grid always covers the last 30 days (and the 30 before, for change);
  // the list below follows the filters.
  const gridFrom = new Date(Date.now() - GRID_DAYS * DAY).toISOString();
  const prevFrom = new Date(Date.now() - 2 * GRID_DAYS * DAY).toISOString();
  const loadFrom = filters.from < prevFrom ? filters.from : prevFrom;
  const [rows, prompts] = await Promise.all([loadBranchResults(branch.id, loadFrom), loadActivePrompts(branch.id)]);
  const responses = toResponses(rows);

  // Question × engine grid.
  const byPrompt = new Map<string, MetricResponse[]>();
  for (const r of responses) {
    const list = byPrompt.get(r.promptText) ?? [];
    list.push(r);
    byPrompt.set(r.promptText, list);
  }
  const promptTexts = [
    ...prompts.map((p) => ({ text: p.text, active: true })),
    ...[...byPrompt.keys()]
      .filter((t) => !prompts.some((p) => p.text === t) && filterResponses(byPrompt.get(t)!, { from: gridFrom }).length)
      .map((t) => ({ text: t, active: false })),
  ];
  const heatRows: HeatRow[] = promptTexts.map(({ text, active }) => {
    const rs = byPrompt.get(text) ?? [];
    const now = rate(rs, gridFrom, undefined);
    const prev = rate(rs, prevFrom, gridFrom);
    return {
      prompt: text,
      active,
      cells: Object.fromEntries(
        ENGINE_IDS.map((e) => {
          const c = rate(rs, gridFrom, undefined, e);
          return [e, { pct: c.answers ? c.pct : null, answers: c.answers }];
        }),
      ),
      overall: now.answers ? now.pct : null,
      change: now.answers && prev.answers && now.pct !== null && prev.pct !== null ? now.pct - prev.pct : null,
    };
  });
  heatRows.sort((a, b) =>
    sort === "change"
      ? (a.change ?? Infinity) - (b.change ?? Infinity) || (a.overall ?? 101) - (b.overall ?? 101)
      : (a.overall ?? 101) - (b.overall ?? 101) || a.prompt.localeCompare(b.prompt),
  );
  const gridEngines = ENGINE_IDS.filter((e) => heatRows.some((r) => r.cells[e]?.answers));

  // The answers list: filters, plus a question and/or engine picked from the grid.
  const current = metricFilter(filters);
  const engine = engineParam && (ENGINE_IDS as readonly string[]).includes(engineParam) ? engineParam : null;
  const mentionedIds = new Set(
    responses.filter((r) => r.agents.some((a) => a.subjectKey === BRANCH_KEY && a.confidence === "high")).map((r) => r.id),
  );
  const byId = new Map(rows.map((r) => [r.id, r]));
  const scoped = filterResponses(responses, current)
    .filter((r) => !promptFilter || r.promptText === promptFilter)
    .filter((r) => !engine || r.engine === engine)
    .filter((r) => (mentioned === "yes" ? mentionedIds.has(r.id) : mentioned === "no" ? r.parsed && !mentionedIds.has(r.id) : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pageCount = Math.max(1, Math.ceil(scoped.length / PAGE_SIZE));
  const slice = scoped.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const details = await loadAnswerDetails(slice.map((r) => r.id));
  const [strips, fallbackCites] = await Promise.all([
    loadRunStrips([...details.values()].map((d) => d.scanRunId)),
    loadCitationUrls(slice.filter((r) => !details.get(r.id)?.citedUrls.length).map((r) => r.id)),
  ]);
  const youBase = [branch.name, ...(branch.aliases ?? [])];

  const extra = { prompt: promptFilter, mentioned, engine: engine ?? null, sort: sort === "change" ? "change" : null };
  const q = (o: Record<string, string | null>) => base + "/prompts" + filterQuery(filters, { ...extra, page: null, ...o });
  const gridHref = (prompt: string, e: string | null) => q({ prompt, engine: e, mentioned: null }) + "#answers";

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader
          title={
            <span className="flex flex-wrap items-baseline gap-x-3">
              Where AI names you <HelpLink section="answers" />
            </span>
          }
          description={`Each question you track, on each assistant: the share of answers in the last ${GRID_DAYS} days that name you. Darker means named more often. Click a cell to read those answers.`}
          action={
            <div className="flex gap-1 text-small" role="group" aria-label="Sort questions">
              {[
                { v: null, label: "Weakest first" },
                { v: "change", label: "Biggest change" },
              ].map((o) => (
                <Link
                  key={o.label}
                  href={q({ sort: o.v })}
                  scroll={false}
                  className={cn(
                    "whitespace-nowrap rounded-full px-2.5 py-1",
                    (o.v ?? "visibility") === sort ? "bg-brand-tint font-medium text-brand" : "text-ink-muted hover:bg-surface-sunken",
                  )}
                >
                  {o.label}
                </Link>
              ))}
            </div>
          }
        />
        {heatRows.length && gridEngines.length ? (
          <HeatGrid rows={heatRows} engines={gridEngines} cellHref={gridHref} />
        ) : (
          <CardBody>
            <EmptyState title={prompts.length ? "No answers yet" : "No tracked questions"}>
              {prompts.length
                ? "The grid fills in after your first scan."
                : "Add the questions sellers and landlords ask in this branch’s settings."}
            </EmptyState>
          </CardBody>
        )}
      </Card>

      <section id="answers" className="scroll-mt-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-heading text-ink">The answers</h2>
            <p className="text-sm text-ink-muted">
              <span className="font-mono">{scoped.length}</span> answer{scoped.length === 1 ? "" : "s"}
              {promptFilter ? <> to “{promptFilter}”</> : null}
              {engine ? <> from {engineLabel(engine)}</> : null}.
              {promptFilter || engine ? (
                <>
                  {" "}
                  <Link href={q({ prompt: null, engine: null }) + "#answers"} className="text-brand hover:underline">
                    Show all
                  </Link>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex gap-1.5 text-small">
            {[
              { v: null, label: "All" },
              { v: "yes", label: "Names you" },
              { v: "no", label: "Doesn’t name you" },
            ].map((o) => (
              <Link
                key={o.label}
                href={q({ mentioned: o.v }) + "#answers"}
                scroll={false}
                className={cn(
                  "rounded-full border px-3 py-1 font-medium",
                  mentioned === o.v ? "border-brand bg-brand text-on-brand" : "border-hairline bg-surface-raised text-ink-muted hover:bg-brand-tint",
                )}
              >
                {o.label}
              </Link>
            ))}
          </div>
        </div>

        <FilterBar basePath={`${base}/prompts`} filters={filters} extra={{ prompt: promptFilter, mentioned, sort: extra.sort }} />

        {slice.length ? (
          <ul className="space-y-4">
            {slice.map((r) => {
              const row = byId.get(r.id)!;
              const d = details.get(r.id);
              const mentions = row.agent_mentions ?? [];
              return (
                <li key={r.id}>
                  <AnswerCard
                    id={r.id}
                    engine={r.engine}
                    createdAt={r.createdAt}
                    question={r.promptText}
                    answerText={d?.answerText ?? null}
                    parseStatus={row.parse_status}
                    namesYou={mentionedIds.has(r.id)}
                    needsReview={row.needs_review}
                    youNames={[...youBase, ...mentions.filter((m) => m.is_branch).map((m) => m.agent_name)]}
                    agentNames={mentions.filter((m) => !m.is_branch).map((m) => m.agent_name)}
                    citedUrls={d?.citedUrls.length ? d.citedUrls : (fallbackCites.get(r.id) ?? [])}
                    runs={d ? strips.get(runKey(d.scanRunId, r.promptText, r.engine)) : undefined}
                    runIndex={d?.runIndex}
                    href={`${base}/responses/${r.id}`}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            title={promptFilter || engine || mentioned ? "No answers match" : "No answers yet"}
            action={
              promptFilter || engine || mentioned ? (
                <Link href={q({ prompt: null, engine: null, mentioned: null }) + "#answers"} className="text-sm font-medium text-brand hover:underline">
                  Clear filters
                </Link>
              ) : null
            }
          >
            {promptFilter || engine || mentioned ? "Try a wider filter or a longer period." : "Answers appear here after your first scan."}
          </EmptyState>
        )}

        {pageCount > 1 ? (
          <nav className="flex items-center justify-between text-sm" aria-label="Pages">
            {page > 1 ? (
              <Link href={q({ page: String(page - 1) }) + "#answers"} className="text-brand hover:underline">
                Newer
              </Link>
            ) : (
              <span />
            )}
            <span className="font-mono text-ink-muted">
              Page {page} of {pageCount}
            </span>
            {page < pageCount ? (
              <Link href={q({ page: String(page + 1) }) + "#answers"} className="text-brand hover:underline">
                Older
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>
    </div>
  );
}

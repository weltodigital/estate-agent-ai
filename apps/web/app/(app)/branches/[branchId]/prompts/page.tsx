import Link from "next/link";
import { BRANCH_KEY, engineLabel, filterResponses, fmt, getScanSettings, INTENT_LABELS, perPromptMetrics, type IntentGroup } from "@privett/core";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { requireBranch } from "@/lib/auth";
import { loadActivePrompts, loadAnswerTexts, loadBranchResults, toResponses } from "@/lib/data/branch-data";
import { filterQuery, metricFilter, parseFilters, type SearchParams } from "@/lib/data/filters";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Prompts and answers" };

const PAGE_SIZE = 25;

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function PromptsPage({
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
  const { lowSampleThreshold } = getScanSettings();
  const base = `/branches/${branch.id}`;
  const promptFilter = first(sp.prompt) ?? null;
  const mentioned = first(sp.mentioned) === "yes" ? "yes" : first(sp.mentioned) === "no" ? "no" : null;
  const page = Math.max(1, Number(first(sp.page)) || 1);

  const [rows, prompts] = await Promise.all([loadBranchResults(branch.id, filters.from), loadActivePrompts(branch.id)]);
  const responses = toResponses(rows);
  const current = metricFilter(filters);

  // Per-prompt table: every active prompt, plus any scanned prompt since retired.
  const stats = new Map(perPromptMetrics(responses, BRANCH_KEY, { filter: current, lowSampleThreshold: 1 }).map((p) => [p.promptText, p]));
  const promptRows = [
    ...prompts.map((p) => ({ text: p.text, intent: p.intent_group, active: true, m: stats.get(p.text) ?? null })),
    ...[...stats.values()]
      .filter((s) => !prompts.some((p) => p.text === s.promptText))
      .map((s) => ({ text: s.promptText, intent: s.intentGroup, active: false, m: s })),
  ].sort((a, b) => (a.m?.visibility ?? 101) - (b.m?.visibility ?? 101));

  // Explorer: every answer in scope, newest first.
  const mentionedIds = new Set(
    responses.filter((r) => r.agents.some((a) => a.subjectKey === BRANCH_KEY && a.confidence === "high")).map((r) => r.id),
  );
  const byId = new Map(rows.map((r) => [r.id, r]));
  const scoped = filterResponses(responses, current)
    .filter((r) => !promptFilter || r.promptText === promptFilter)
    .filter((r) => (mentioned === "yes" ? mentionedIds.has(r.id) : mentioned === "no" ? r.parsed && !mentionedIds.has(r.id) : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pageCount = Math.max(1, Math.ceil(scoped.length / PAGE_SIZE));
  const slice = scoped.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const texts = await loadAnswerTexts(slice.map((r) => r.id));

  const extra = { prompt: promptFilter, mentioned };
  const q = (o: Record<string, string | null>) => base + "/prompts" + filterQuery(filters, { ...extra, page: null, ...o });

  return (
    <div className="space-y-8">
      <FilterBar basePath={`${base}/prompts`} filters={filters} extra={extra} />

      <Card>
        <CardHeader
          title="Your tracked questions"
          description="How often AI names you for each question, worst first. Click a question to read every answer."
        />
        {promptRows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-small text-ink-muted">
                <tr>
                  <th className="px-5 py-2 font-medium">Question</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 text-right font-medium">Responses</th>
                  <th className="px-3 py-2 text-right font-medium">Visibility</th>
                  <th className="px-5 py-2 text-right font-medium">Position</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {promptRows.map((p) => {
                  const low = !p.m || p.m.responses < 3;
                  return (
                    <tr key={p.text} className={cn("border-t border-hairline", promptFilter === p.text && "bg-surface-sunken")}>
                      <td className="px-5 py-2">
                        <Link href={q({ prompt: p.text }) + "#answers"} className="text-ink hover:underline">
                          {p.text}
                        </Link>
                        {!p.active ? <span className="ml-2 text-small text-ink-muted">(no longer tracked)</span> : null}
                      </td>
                      <td className="px-3 py-2 text-small text-ink-muted">{INTENT_LABELS[p.intent as IntentGroup] ?? p.intent}</td>
                      <td className="px-3 py-2 text-right text-ink-muted">{p.m?.responses ?? 0}</td>
                      <td className={cn("px-3 py-2 text-right", low && "text-ink-muted")}>{fmt.pct(p.m?.visibility ?? null)}</td>
                      <td className={cn("px-5 py-2 text-right", low && "text-ink-muted")}>{fmt.position(p.m?.position ?? null)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            <EmptyState title="No tracked questions">Add questions in this branch’s settings.</EmptyState>
          </div>
        )}
      </Card>

      <section id="answers" className="scroll-mt-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-heading text-ink">Every answer</h2>
            <p className="text-sm text-ink-muted">
              <span className="font-mono">{scoped.length}</span> response{scoped.length === 1 ? "" : "s"}
              {promptFilter ? (
                <>
                  {" "}to “{promptFilter}”.{" "}
                  <Link href={q({ prompt: null }) + "#answers"} className="text-brand hover:underline">
                    Show all questions
                  </Link>
                </>
              ) : (
                "."
              )}
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
                className={cn(
                  "rounded-full border px-3 py-1 font-medium",
                  mentioned === o.v ? "border-brand bg-brand text-on-brand" : "border-hairline bg-surface-raised text-ink-muted",
                )}
              >
                {o.label}
              </Link>
            ))}
          </div>
        </div>

        {slice.length ? (
          <ul className="space-y-3">
            {slice.map((r) => {
              const row = byId.get(r.id)!;
              const named = [...row.agent_mentions].sort((a, b) => a.position - b.position);
              const text = texts.get(r.id)?.answer_text ?? null;
              return (
                <li key={r.id}>
                  <details className="group rounded-lg border border-hairline bg-surface-raised">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm">
                      <span className="font-medium text-ink">{engineLabel(r.engine)}</span>
                      <span className="text-ink-muted">{r.promptText}</span>
                      <span className="text-small text-ink-muted">{formatDateTime(r.createdAt)}</span>
                      <span className="ml-auto flex flex-wrap gap-1.5">
                        {!r.parsed ? <Badge tone="warn">Couldn’t read</Badge> : mentionedIds.has(r.id) ? <Badge tone="good">Names you</Badge> : <Badge>Doesn’t name you</Badge>}
                        {row.needs_review ? <Badge tone="warn">Needs review</Badge> : null}
                      </span>
                    </summary>
                    <div className="space-y-3 border-t border-hairline px-5 py-4 text-sm">
                      {named.length ? (
                        <ol className="flex flex-wrap gap-1.5">
                          {named.map((a) => (
                            <li key={`${a.position}-${a.normalised_name}`}>
                              <Badge tone={a.is_branch && a.match_confidence === "high" ? "brand" : "neutral"}>
                                {a.position}. {a.agent_name}
                                {a.match_confidence === "low" ? " (unsure)" : ""}
                              </Badge>
                            </li>
                          ))}
                        </ol>
                      ) : null}
                      <p className="whitespace-pre-wrap rounded-md bg-surface-sunken p-3 font-mono text-data text-ink">{text ? (text.length > 900 ? `${text.slice(0, 900)}…` : text) : "No answer text stored."}</p>
                      <Link href={`${base}/responses/${r.id}`} className="inline-block text-brand hover:underline">
                        Full answer, citations and raw data
                      </Link>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="No answers match these filters" />
        )}

        {pageCount > 1 ? (
          <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pages">
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

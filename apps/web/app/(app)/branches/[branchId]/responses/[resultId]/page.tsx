import Link from "next/link";
import { notFound } from "next/navigation";
import { INTENT_LABELS, type IntentGroup } from "@privett/core";
import { AnswerCard } from "@/components/answers/answer-card";
import { loadRunStrips } from "@/components/answers/data";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { runKey } from "@/lib/data/answers";
import { requireBranch } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Answer" };

export default async function ResponsePage({ params }: { params: Promise<{ branchId: string; resultId: string }> }) {
  const { branchId, resultId } = await params;
  const { branch } = await requireBranch(branchId);
  const supabase = await getSupabaseServerClient();

  const { data: r } = await supabase
    .from("scan_results")
    .select(
      "id, scan_run_id, engine, model, prompt_text, intent_group, run_index, answer_text, raw_json, parse_status, mentioned, position, sentiment_label, sentiment_score, descriptors, match_confidence, needs_review, error, created_at",
    )
    .eq("id", resultId)
    .eq("branch_id", branch.id)
    .maybeSingle();
  if (!r) notFound();

  const [{ data: mentions }, { data: citations }, { data: competitors }] = await Promise.all([
    supabase
      .from("agent_mentions")
      .select("agent_name, position, is_branch, matched_competitor_id, match_confidence, sentiment_score, descriptors")
      .eq("scan_result_id", r.id)
      .order("position"),
    supabase.from("citations").select("url, domain, is_own_domain, competitor_id").eq("scan_result_id", r.id),
    supabase.from("competitors").select("id, name").eq("branch_id", branch.id),
  ]);
  const compName = new Map((competitors ?? []).map((c) => [c.id as string, c.name as string]));
  const strips = await loadRunStrips([r.scan_run_id as string]);
  const raw = r.raw_json as { citedUrls?: unknown } | null;
  const citedUrls = Array.isArray(raw?.citedUrls)
    ? (raw.citedUrls as unknown[]).filter((u): u is string => typeof u === "string")
    : (citations ?? []).map((c) => c.url as string);
  const base = `/branches/${branch.id}`;

  return (
    <div className="space-y-6">
      <Link href={`${base}/prompts#answers`} className="text-sm text-brand hover:underline">
        Back to the answers
      </Link>

      <AnswerCard
        id={r.id}
        engine={r.engine}
        createdAt={r.created_at}
        question={r.prompt_text}
        answerText={r.answer_text}
        parseStatus={r.parse_status}
        namesYou={!!r.mentioned}
        needsReview={r.needs_review}
        youNames={[branch.name, ...(branch.aliases ?? []), ...(mentions ?? []).filter((m) => m.is_branch).map((m) => m.agent_name as string)]}
        agentNames={(mentions ?? []).filter((m) => !m.is_branch).map((m) => m.agent_name as string)}
        citedUrls={citedUrls}
        runs={strips.get(runKey(r.scan_run_id as string, r.prompt_text, r.engine))}
        runIndex={r.run_index}
        preview={null}
      />

      <p className="text-small text-ink-muted">
        {r.model} · run <span className="font-mono">{r.run_index + 1}</span> · {INTENT_LABELS[r.intent_group as IntentGroup] ?? r.intent_group}
        {r.parse_status === "ok" && r.mentioned ? <> · you were named <span className="font-mono">#{r.position ?? "—"}</span></> : null}
        {r.match_confidence ? ` · match confidence ${r.match_confidence}` : ""}
        {r.parse_status !== "ok" ? ` · left out of every metric${r.error ? `: ${r.error}` : ""}` : ""}
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Agents named" description="In the order they appear." />
          {mentions?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-small text-ink-muted">
                  <tr>
                    <th className="px-5 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Agent</th>
                    <th className="px-3 py-2 text-right font-medium">Sentiment</th>
                    <th className="px-5 py-2 font-medium">Described as</th>
                  </tr>
                </thead>
                <tbody>
                  {mentions.map((m) => (
                    <tr key={`${m.position}-${m.agent_name}`} className="border-t border-hairline align-top">
                      <td className="px-5 py-2 font-mono">{m.position}</td>
                      <td className="px-3 py-2">
                        <span className={m.is_branch ? "font-medium text-ink" : "text-ink"}>{m.agent_name}</span>
                        <span className="block text-small text-ink-muted">
                          {m.is_branch ? "You" : m.matched_competitor_id ? `Competitor: ${compName.get(m.matched_competitor_id) ?? "unknown"}` : "Not matched"}
                          {m.match_confidence === "low" ? " · unsure match" : ""}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{m.sentiment_score ?? "—"}</td>
                      <td className="px-5 py-2 text-small text-ink-muted">{(m.descriptors ?? []).join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <CardBody>
              <p className="text-sm text-ink-muted">No agents were named.</p>
            </CardBody>
          )}
        </Card>

        <Card>
          <CardHeader title="Sources cited" />
          <CardBody>
            {citations?.length ? (
              <ul className="space-y-2 text-sm">
                {citations.map((c) => (
                  <li key={c.url} className="break-all">
                    <a href={c.url} target="_blank" rel="noopener noreferrer nofollow" className="text-ink hover:underline">
                      {c.url}
                    </a>
                    {c.is_own_domain ? <Badge tone="good" className="ml-2">Your site</Badge> : null}
                    {c.competitor_id ? <Badge className="ml-2">{compName.get(c.competitor_id) ?? "Competitor"}</Badge> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">No sources cited.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <details className="rounded-lg border border-hairline bg-surface-raised">
        <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-ink-muted">Raw response data</summary>
        <div className="border-t border-hairline px-5 py-3">
          <p className="mb-1 text-small font-medium text-ink-muted">Answer text exactly as returned</p>
          <pre className="mb-4 max-h-[24rem] overflow-auto whitespace-pre-wrap break-words rounded-md bg-surface-sunken p-3 font-mono text-data text-ink">
            {r.answer_text ?? "No answer text stored."}
          </pre>
          <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words font-mono text-small text-ink-muted">
            {JSON.stringify(withoutCosts(r.raw_json), null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
}

/** The provider's raw response without its usage and cost figures, which are ours to know, not customers'. */
function withoutCosts(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutCosts);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => !/^(usage|usageMetadata|cost|costUsd|cost_usd|billing)$/i.test(k))
        .map(([k, v]) => [k, withoutCosts(v)]),
    );
  }
  return value;
}

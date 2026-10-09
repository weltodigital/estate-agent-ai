import Link from "next/link";
import { notFound } from "next/navigation";
import { engineLabel, INTENT_LABELS, type IntentGroup } from "@privett/core";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { requireBranch } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime, formatUsd } from "@/lib/utils";

export const metadata = { title: "Answer" };

export default async function ResponsePage({ params }: { params: Promise<{ branchId: string; resultId: string }> }) {
  const { branchId, resultId } = await params;
  const { branch } = await requireBranch(branchId);
  const supabase = await getSupabaseServerClient();

  const { data: r } = await supabase
    .from("scan_results")
    .select(
      "id, scan_run_id, engine, model, prompt_text, intent_group, run_index, answer_text, raw_json, parse_status, mentioned, position, sentiment_label, sentiment_score, descriptors, match_confidence, needs_review, error, cost_usd, created_at",
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
  const base = `/branches/${branch.id}`;

  return (
    <div className="space-y-6">
      <Link href={`${base}/prompts#answers`} className="text-sm text-brand-terracotta hover:underline">
        Back to every answer
      </Link>

      <div>
        <p className="text-sm text-brand-slate">
          {engineLabel(r.engine)} · {r.model} · {formatDateTime(r.created_at)} · run {r.run_index + 1} ·{" "}
          {INTENT_LABELS[r.intent_group as IntentGroup] ?? r.intent_group}
        </p>
        <h2 className="mt-1 text-2xl text-brand-ink">“{r.prompt_text}”</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {r.parse_status !== "ok" ? (
            <Badge tone="warn">{r.parse_status === "engine_error" ? "Engine error" : "Couldn’t read this answer"}</Badge>
          ) : r.mentioned ? (
            <Badge tone="good">Names you at position {r.position ?? "—"}</Badge>
          ) : (
            <Badge>Doesn’t name you</Badge>
          )}
          {r.needs_review ? <Badge tone="warn">Needs review: possible match to you</Badge> : null}
          {r.match_confidence ? <Badge>Match confidence: {r.match_confidence}</Badge> : null}
        </div>
        {r.parse_status !== "ok" ? (
          <p className="mt-2 text-sm text-brand-walnut">This response is left out of every metric. {r.error ?? ""}</p>
        ) : null}
      </div>

      <Card>
        <CardHeader title="The answer, as the assistant gave it" />
        <CardBody>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-ink">{r.answer_text ?? "No answer text stored."}</p>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Agents named" description="In the order they appear." />
          {mentions?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-brand-slate">
                  <tr>
                    <th className="px-5 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Agent</th>
                    <th className="px-3 py-2 text-right font-medium">Sentiment</th>
                    <th className="px-5 py-2 font-medium">Described as</th>
                  </tr>
                </thead>
                <tbody>
                  {mentions.map((m) => (
                    <tr key={`${m.position}-${m.agent_name}`} className="border-t border-brand-stone align-top">
                      <td className="px-5 py-2 tabular-nums">{m.position}</td>
                      <td className="px-3 py-2">
                        <span className={m.is_branch ? "font-medium text-brand-ink" : "text-brand-ink"}>{m.agent_name}</span>
                        <span className="block text-xs text-brand-slate">
                          {m.is_branch ? "You" : m.matched_competitor_id ? `Competitor: ${compName.get(m.matched_competitor_id) ?? "unknown"}` : "Not matched"}
                          {m.match_confidence === "low" ? " · unsure match" : ""}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{m.sentiment_score ?? "—"}</td>
                      <td className="px-5 py-2 text-xs text-brand-walnut">{(m.descriptors ?? []).join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <CardBody>
              <p className="text-sm text-brand-slate">No agents were named.</p>
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
                    <a href={c.url} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-ink hover:underline">
                      {c.url}
                    </a>
                    {c.is_own_domain ? <Badge tone="good" className="ml-2">Your site</Badge> : null}
                    {c.competitor_id ? <Badge className="ml-2">{compName.get(c.competitor_id) ?? "Competitor"}</Badge> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-brand-slate">No sources cited.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <details className="rounded-lg border border-brand-stone bg-white">
        <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-brand-ink">Raw response data</summary>
        <div className="border-t border-brand-stone px-5 py-3">
          <p className="mb-2 text-xs text-brand-slate">Cost of this response: {formatUsd(r.cost_usd)}</p>
          <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-brand-walnut">
            {JSON.stringify(r.raw_json, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
}

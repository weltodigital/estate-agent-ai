import { notFound } from "next/navigation";
import { fmt } from "@privett/core";
import { Wordmark } from "@/components/brand/wordmark";
import { requireAdmin } from "@/lib/auth";
import { loadLeagueTable } from "@/lib/league";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "League table image" };

/** Clean, fixed-width view to screenshot for the newsletter. */
export default async function LeagueImagePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const data = await loadLeagueTable(id);
  if (!data?.latest) notFound();
  const { table, rows, latest, responseCount } = data;

  return (
    <div className="flex min-h-screen items-start justify-center bg-brand-bone p-10">
      <div className="w-[880px] rounded-xl bg-white p-10 shadow-card">
        <p className="text-sm uppercase tracking-wide text-brand-slate">AI visibility league table</p>
        <h1 className="mt-1 text-5xl text-brand-ink">Estate agents in {table.town}</h1>
        <p className="mt-2 text-brand-walnut">
          How often ChatGPT, Perplexity, Gemini and Claude name each agent when asked who to use. {responseCount} answers, {formatDate(latest.finished_at)}.
        </p>
        <table className="mt-8 w-full text-left">
          <thead className="text-sm text-brand-slate">
            <tr className="border-b-2 border-brand-hedge">
              <th className="py-2 font-medium">#</th>
              <th className="py-2 font-medium">Agent</th>
              <th className="py-2 text-right font-medium">Mention rate</th>
              <th className="py-2 text-right font-medium">Share of voice</th>
            </tr>
          </thead>
          <tbody className="tabular-nums text-lg">
            {rows.map((r, i) => (
              <tr key={r.agentId} className="border-b border-brand-stone">
                <td className="py-2.5 text-brand-slate">{i + 1}</td>
                <td className="py-2.5">{r.name}</td>
                <td className="py-2.5 text-right font-medium">{fmt.pct(r.mentionRate)}</td>
                <td className="py-2.5 text-right">{fmt.pct(r.shareOfVoice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-8 flex items-end justify-between text-xs text-brand-slate">
          <p className="max-w-md">
            Mention rate: share of answers naming the agent. Share of voice: the agent's share of all agent mentions. AI answers vary from run to run.
          </p>
          <Wordmark size={22} />
        </div>
      </div>
    </div>
  );
}

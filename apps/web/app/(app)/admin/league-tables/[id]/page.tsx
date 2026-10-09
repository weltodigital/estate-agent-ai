import Link from "next/link";
import { notFound } from "next/navigation";
import { fmt } from "@privett/core";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/auth";
import { loadLeagueTable } from "@/lib/league";
import { formatDateTime, formatUsd } from "@/lib/utils";
import { queueLeagueScan } from "../actions";

export const metadata = { title: "League table" };

export default async function LeagueTablePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const data = await loadLeagueTable(id);
  if (!data) notFound();
  const { table, rows, runs, latest, alsoNamed, responseCount, agents } = data;
  const inFlight = runs.some((r) => r.status === "queued" || r.status === "running");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        title={`${table.town} league table`}
        description={`${agents.length} agents${table.areas?.length ? ` · ${table.areas.join(", ")}` : ""}`}
        action={
          <div className="flex gap-2">
            <form action={queueLeagueScan}>
              <input type="hidden" name="league_table_id" value={table.id} />
              <Button variant="secondary" disabled={inFlight}>{inFlight ? "Scan in progress" : "Run scan"}</Button>
            </form>
            {latest ? (
              <>
                <a href={`/api/admin/league-tables/${table.id}/csv`} className={buttonClasses("secondary")}>CSV</a>
                <Link href={`/admin/league-tables/${table.id}/image`} className={buttonClasses("primary")}>Image view</Link>
              </>
            ) : null}
          </div>
        }
      />

      {!latest ? (
        <EmptyState title={inFlight ? "Scan in progress" : "No completed scan yet"}>
          {inFlight ? "Refresh in a few minutes." : "Run a scan to fill the table."}
        </EmptyState>
      ) : (
        <Card>
          <CardHeader title="Results" description={`Based on ${responseCount} AI answers from the scan finished ${formatDateTime(latest.finished_at)}.`} />
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="text-small text-ink-muted">
                <tr>
                  <th className="px-5 py-2 font-medium">#</th>
                  <th className="font-medium">Agent</th>
                  <th className="text-right font-medium">Mention rate</th>
                  <th className="text-right font-medium">Share of voice</th>
                  <th className="px-5 text-right font-medium">Avg position</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {rows.map((r, i) => (
                  <tr key={r.agentId} className="border-t border-hairline">
                    <td className="px-5 py-2 text-ink-muted">{i + 1}</td>
                    <td>
                      {r.name} {r.domain ? <span className="text-ink-muted">{r.domain}</span> : null}
                    </td>
                    <td className="text-right">{fmt.pct(r.mentionRate)}</td>
                    <td className="text-right">{fmt.pct(r.shareOfVoice)}</td>
                    <td className="px-5 text-right">{fmt.position(r.position)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {alsoNamed.length ? (
        <Card>
          <CardHeader title="Also named by AI, not on your list" description="Answers naming each. Consider adding them and re-running." />
          <CardBody className="flex flex-wrap gap-2">
            {alsoNamed.map((a) => (
              <Badge key={a.name}>
                {a.name} · {a.mentions}
              </Badge>
            ))}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Scan history" />
        <CardBody className="space-y-1 text-sm">
          {runs.map((r) => (
            <p key={r.id} className="font-mono">
              {formatDateTime(r.created_at)} · <Badge>{r.status}</Badge> · {formatUsd(r.cost_usd)}
              {r.error ? <span className="text-down"> · {r.error}</span> : null}
            </p>
          ))}
          {!runs.length ? <p className="text-ink-muted">No scans yet.</p> : null}
        </CardBody>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { ActionForm } from "@/components/platform/action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";
import { createLeagueTable } from "./actions";

export const metadata = { title: "League tables" };

export default async function LeagueTablesPage() {
  await requireAdmin();
  const { data: tables } = await getSupabaseAdminClient()
    .from("league_tables")
    .select("id, town, areas, status, created_at, league_agents(count)")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader title="Town league tables" description="Mention rate and share of voice for every agent in a town. Internal, for the Subject to Contract newsletter." />
      <Card>
        <CardHeader title="New league table" />
        <CardBody>
          <ActionForm action={createLeagueTable} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Town">
                <Input name="town" required />
              </Field>
              <Field label="Neighbourhoods" hint="Comma separated, optional.">
                <Input name="areas" />
              </Field>
            </div>
            <Field label="Agents" hint="One per line: name,domain. Domain is optional but improves matching.">
              <Textarea name="agents" rows={8} placeholder={"Fox & Sons,foxandsons.co.uk\nBernards,bernardsea.co.uk"} />
            </Field>
            <Field label="Or upload a CSV" hint="Same format: name,domain.">
              <input type="file" name="file" accept=".csv,text/csv" className="text-sm" />
            </Field>
            <Button type="submit">Create</Button>
          </ActionForm>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="All league tables" />
        <CardBody className="divide-y divide-hairline p-0">
          {(tables ?? []).map((t) => (
            <Link key={t.id} href={`/admin/league-tables/${t.id}`} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-brand-tint">
              <span className="font-medium">{t.town}</span>
              <span className="text-ink-muted">{(t.league_agents as unknown as { count: number }[])?.[0]?.count ?? 0} agents</span>
              <Badge className="ml-auto">{t.status}</Badge>
              <span className="font-mono text-ink-muted">{formatDate(t.created_at)}</span>
            </Link>
          ))}
          {!tables?.length ? <p className="px-5 py-4 text-sm text-ink-muted">None yet.</p> : null}
        </CardBody>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { ActionForm } from "@/components/platform/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { requireUser } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { claimFreeScan, createOrganisation } from "./actions";

export const metadata = { title: "Set up your agency" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const supabase = await getSupabaseServerClient();
  const { count } = await supabase
    .from("organisation_members")
    .select("org_id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) > 0) redirect("/dashboard");

  // Free scans run under this (verified) email that nobody has claimed yet.
  const { data: scans } = await getSupabaseAdminClient()
    .from("free_scans")
    .select("id, agency_name, town, domain, created_at, organisations!inner(claimed)")
    .ilike("email", user.email ?? "")
    .is("claimed_by", null)
    .eq("organisations.claimed", false)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <Link href="/" aria-label="Privett home">
        <Wordmark size={24} />
      </Link>
      <h1 className="mt-10 text-4xl text-brand-ink">Set up your agency</h1>
      <p className="mt-2 text-brand-walnut">One organisation holds all your branches and colleagues.</p>

      {scans?.length ? (
        <Card className="mt-8">
          <CardHeader title="Pick up where your free scan left off" description="Keep its results and carry on from there." />
          <CardBody className="space-y-3">
            {scans.map((s) => (
              <ActionForm key={s.id} action={claimFreeScan} className="flex items-center justify-between gap-4">
                <input type="hidden" name="free_scan_id" value={s.id} />
                <div className="text-sm">
                  <p className="font-medium text-brand-ink">{s.agency_name}</p>
                  <p className="text-brand-slate">
                    {s.town} · {s.domain} · {formatDate(s.created_at)}
                  </p>
                </div>
                <Button size="sm">Use this</Button>
              </ActionForm>
            ))}
          </CardBody>
        </Card>
      ) : null}

      <Card className="mt-8">
        <CardHeader title={scans?.length ? "Or start fresh" : "Your agency"} />
        <CardBody>
          <ActionForm action={createOrganisation} className="space-y-4">
            <Field label="Agency name" hint="The brand name. You'll add individual branches next.">
              <Input name="name" required maxLength={120} />
            </Field>
            <Button type="submit">Continue</Button>
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}

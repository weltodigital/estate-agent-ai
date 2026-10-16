import Link from "next/link";
import { ActionForm } from "@/components/platform/action-form";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrg } from "@/lib/auth";
import { getPlans } from "@privett/core";
import { countActiveBranches } from "@/lib/billing";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { PRICES_GBP } from "@/lib/seo";
import { createBranch } from "./actions";

export const metadata = { title: "Add a branch" };

export default async function NewBranchPage() {
  const ctx = await requireOrg();
  const used = await countActiveBranches(ctx.org.id);

  if (!ctx.plan.paid || used >= ctx.plan.limits.maxBranches) {
    const plans = getPlans();
    const agency = plans.agency.limits;
    const isOwner = ctx.role === "owner";
    const current = ctx.plan.paid ? plans[ctx.plan.planId] : null;
    const singleBranchPlan = ctx.plan.paid && ctx.plan.limits.maxBranches === 1;
    const { data: existing } = await (await getSupabaseServerClient())
      .from("branches")
      .select("name")
      .eq("org_id", ctx.org.id)
      .is("archived_at", null)
      .order("created_at")
      .limit(1);
    const firstBranch = existing?.[0]?.name ?? "your current branch";
    const twoBranches = `£${PRICES_GBP.agency * agency.minBranches}`;

    // Owners see the change (and its price) on the change-plan page first.
    const action = (label: string) =>
      isOwner ? (
        <Link href={`/settings/billing/change?plan=agency&branches=${Math.max(used + 1, agency.minBranches)}`} className={buttonClasses("primary")}>
          {label}
        </Link>
      ) : (
        <p className="text-small text-ink-muted">Ask an owner of {ctx.org.name} to change the plan.</p>
      );

    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Add a branch" />
        {!ctx.plan.paid ? (
          <EmptyState
            title="Tracking a branch needs a plan"
            action={<Link href="/settings/billing" className={buttonClasses("primary")}>Choose a plan</Link>}
          >
            Plans start at £{PRICES_GBP.starter} a month and include weekly scans, every answer and fixes for each branch.
          </EmptyState>
        ) : singleBranchPlan ? (
          <Card>
            <CardBody className="space-y-4">
              <div>
                <h2 className="text-heading text-ink">Your {current!.name} plan covers one branch</h2>
                <p className="mt-1 text-ink-muted">To track more than one branch, switch to <strong className="text-ink">Agency</strong>.</p>
              </div>
              <ul className="space-y-2 text-sm text-ink">
                <li>
                  £{PRICES_GBP.agency} per branch a month, minimum {agency.minBranches} branches.
                </li>
                <li>
                  {firstBranch} moves across with you, so two branches cost {twoBranches} a month, replacing your{" "}
                  {`£${PRICES_GBP[ctx.plan.planId as keyof typeof PRICES_GBP]}`} a month {current!.name} plan.
                </li>
                <li>
                  Each branch gets all four assistants and up to {agency.promptsPerBranch} questions
                  {agency.promptsPerBranch < ctx.plan.limits.promptsPerBranch ? ` (${current!.name} has ${ctx.plan.limits.promptsPerBranch})` : ""}.
                </li>
                <li>Stripe adjusts your bill for the rest of this month automatically.</li>
              </ul>
              <div className="flex flex-wrap items-center gap-4 pt-1">
                {action("Switch to Agency")}
                <Link href="/pricing" className="text-sm text-brand hover:underline">Compare plans</Link>
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody className="space-y-4">
              <div>
                <h2 className="text-heading text-ink">
                  Your Agency plan covers {ctx.plan.limits.maxBranches} branches, and you&apos;re tracking all of them
                </h2>
                <p className="mt-1 text-ink-muted">
                  Add another branch to your plan for £{PRICES_GBP.agency} a month. Stripe adjusts
                  your bill for the rest of this month automatically, then you can set the new branch up here.
                </p>
              </div>
              {action("Add a branch to my plan")}
            </CardBody>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Add a branch"
        description="We'll start your first scan as soon as you save. It usually finishes within a few minutes."
      />
      <Card>
        <CardBody>
          <ActionForm action={createBranch} className="space-y-4">
            <Field label="Branch name" hint="As people know it, e.g. Bernards Southsea.">
              <Input name="name" required maxLength={120} />
            </Field>
            <Field label="Other names AI might use" hint="Comma separated, e.g. Bernards Estate Agents, Bernards Southsea Lettings.">
              <Input name="aliases" />
            </Field>
            <Field label="Website" hint="Used to match citations to you and check your site.">
              <Input name="website" placeholder="https://www.example.co.uk" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Town">
                <Input name="town" required maxLength={80} placeholder="Portsmouth" />
              </Field>
              <Field label="Postcode" hint="If another town shares your town's name, we use this to add your county to questions.">
                <Input name="postcode" maxLength={10} />
              </Field>
            </div>
            <Field label="Neighbourhoods you cover" hint={`Up to ${ctx.plan.limits.maxAreas}, comma separated, e.g. Southsea, Drayton. We always ask with your town, e.g. "best estate agent in Drayton, Portsmouth", so places with the same name elsewhere don't get mixed in.`}>
              <Input name="areas" />
            </Field>
            <Button type="submit">Save and start scanning</Button>
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}

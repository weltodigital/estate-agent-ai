import Link from "next/link";
import { ActionForm } from "@/components/platform/action-form";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrg } from "@/lib/auth";
import { countActiveBranches } from "@/lib/billing";
import { createBranch } from "./actions";

export const metadata = { title: "Add a branch" };

export default async function NewBranchPage() {
  const ctx = await requireOrg();
  const used = await countActiveBranches(ctx.org.id);

  if (!ctx.plan.paid || used >= ctx.plan.limits.maxBranches) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Add a branch" />
        <EmptyState
          title={ctx.plan.paid ? "You've used every branch on your plan" : "Tracking a branch needs a plan"}
          action={
            <Link href="/settings/billing" className={buttonClasses("primary")}>
              {ctx.plan.paid ? "Add branches" : "Choose a plan"}
            </Link>
          }
        >
          {ctx.plan.paid
            ? `Your plan covers ${ctx.plan.limits.maxBranches} branch${ctx.plan.limits.maxBranches === 1 ? "" : "es"}.`
            : "Plans include weekly scans across ChatGPT, Perplexity, Gemini and Claude, with fixes for each branch."}
        </EmptyState>
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
              <Field label="Postcode">
                <Input name="postcode" maxLength={10} />
              </Field>
            </div>
            <Field label="Neighbourhoods you cover" hint="Comma separated, e.g. Southsea, Drayton. We'll track questions about each.">
              <Input name="areas" />
            </Field>
            <Button type="submit">Save and start scanning</Button>
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}

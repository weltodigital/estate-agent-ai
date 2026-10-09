import { engineLabel, getPlans } from "@privett/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrg } from "@/lib/auth";
import { countActiveBranches, getOrgSubscriptions, priceLabel, purchasablePlans } from "@/lib/billing";
import { COPY } from "@/lib/copy";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Plan and billing" };

const MESSAGES: Record<string, string> = {
  success: "Thank you. Your plan will update within a minute.",
  cancelled: "Checkout cancelled. Nothing has been charged.",
};
const ERRORS: Record<string, string> = {
  owner: "Only an owner can change the plan.",
  plan: "That plan isn't available yet.",
  stripe: COPY.genericError,
  portal: "Billing management opens once you've subscribed.",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; error?: string; welcome?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await requireOrg();
  const [branches, subs] = await Promise.all([countActiveBranches(ctx.org.id), getOrgSubscriptions(ctx.org.id)]);
  const current = getPlans()[ctx.plan.planId];
  const sub = subs[0];
  const isOwner = ctx.role === "owner";

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Plan and billing" description={sp.welcome ? "Choose a plan to start tracking your branches." : undefined} />
      {sp.checkout && MESSAGES[sp.checkout] ? <p className="mb-4 rounded-md bg-surface-sunken p-3 text-sm">{MESSAGES[sp.checkout]}</p> : null}
      {sp.error && ERRORS[sp.error] ? (
        <p role="alert" className="mb-4 rounded-md bg-warn/10 p-3 text-sm text-warn">
          {ERRORS[sp.error]}
        </p>
      ) : null}

      <Card className="mb-8">
        <CardHeader
          title={`Current plan: ${current.name}`}
          action={sub ? <Badge tone={["active", "trialing"].includes(sub.status) ? "good" : "warn"}>{sub.status.replace("_", " ")}</Badge> : null}
        />
        <CardBody className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-ink-muted">Branches</p>
            <p className="font-mono text-heading font-medium">
              {branches} of {ctx.plan.paid ? ctx.plan.limits.maxBranches : 0}
            </p>
          </div>
          <div>
            <p className="text-ink-muted">Questions per branch</p>
            <p className="font-mono text-heading font-medium">{ctx.plan.paid ? ctx.plan.limits.promptsPerBranch : "—"}</p>
          </div>
          <div>
            <p className="text-ink-muted">{sub?.cancel_at_period_end ? "Ends" : "Renews"}</p>
            <p className="font-mono text-heading font-medium">{formatDate(sub?.current_period_end)}</p>
          </div>
        </CardBody>
        {ctx.plan.paid && isOwner ? (
          <CardBody className="border-t border-hairline">
            <form action="/api/stripe/portal" method="post">
              <Button variant="secondary">Manage billing, invoices and branch count</Button>
            </form>
          </CardBody>
        ) : null}
      </Card>

      {!ctx.plan.paid ? (
        <div className="grid gap-6 md:grid-cols-2">
          {purchasablePlans().map((p) => (
            <Card key={p.id} className="flex flex-col">
              <CardHeader title={p.name} description={p.description} />
              <CardBody className="flex flex-1 flex-col gap-4 text-sm">
                <p className="text-title">{priceLabel(p.id)}</p>
                <ul className="space-y-1 text-ink-muted">
                  <li>Up to {p.limits.promptsPerBranch} questions per branch</li>
                  <li>{p.limits.engines.map(engineLabel).join(", ")}</li>
                  <li>{p.limits.runsPerPrompt} runs per question, every {p.limits.scanIntervalDays} days</li>
                  <li>Fixes with ready-to-paste drafts</li>
                  <li>AI referral tracking for your website</li>
                </ul>
                {isOwner ? (
                  <form action="/api/stripe/checkout" method="post" className="mt-auto space-y-2">
                    <input type="hidden" name="plan_id" value={p.id} />
                    {p.id === "multi" ? (
                      <label className="block text-small text-ink-muted">
                        Number of branches
                        <Input type="number" name="quantity" min={Math.max(branches, 1)} max={p.limits.maxBranches} defaultValue={Math.max(branches, 2)} className="mt-1" />
                      </label>
                    ) : null}
                    <Button className="w-full" disabled={!p.stripePriceId}>
                      {p.stripePriceId ? `Choose ${p.name}` : "Not yet available"}
                    </Button>
                  </form>
                ) : (
                  <p className="mt-auto text-small text-ink-muted">Ask an owner of {ctx.org.name} to choose a plan.</p>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      ) : null}
      <p className="mt-8 text-small text-ink-muted">{COPY.noPromise}</p>
    </div>
  );
}

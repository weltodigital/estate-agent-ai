import { engineLabel, getPlans, MANUAL_SCAN_WINDOW_DAYS, type PlanId, type PlanLimits } from "@privett/core";
import { AssistantChips } from "@/components/marketing/assistant-names";
import { PRICES_GBP } from "@/lib/seo";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
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
  // Extra "Scan now" runs across the organisation's branches in the current window.
  const { count: extraScansUsed } = await getSupabaseAdminClient()
    .from("scan_runs")
    .select("id", { count: "exact", head: true })
    .eq("org_id", ctx.org.id)
    .eq("kind", "manual")
    .gte("created_at", new Date(Date.now() - MANUAL_SCAN_WINDOW_DAYS * 86_400_000).toISOString());

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Plan and billing" description={sp.welcome ? "Choose a plan to start tracking your branches." : undefined} />
      {sp.checkout && MESSAGES[sp.checkout] ? <p className="mb-4 rounded-md bg-surface-sunken p-3 text-sm">{MESSAGES[sp.checkout]}</p> : null}
      {sp.error && ERRORS[sp.error] ? (
        <p role="alert" className="mb-4 rounded-md bg-warn/10 p-3 text-sm text-warn">
          {ERRORS[sp.error]}
        </p>
      ) : null}

      {ctx.plan.paid && sub ? (
        <PaidPlan
          planName={current.name}
          planId={ctx.plan.planId}
          limits={ctx.plan.limits}
          sub={sub}
          branches={branches}
          extraScansUsed={extraScansUsed}
          isOwner={isOwner}
          orgName={ctx.org.name}
        />
      ) : (
        <Card className="mb-8">
          <CardHeader title="No plan yet" description="Choose a plan below to start weekly tracking." />
        </Card>
      )}

      {!ctx.plan.paid ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                    {p.limits.maxBranches > 1 ? (
                      <label className="block text-small text-ink-muted">
                        Number of branches
                        <Input type="number" name="quantity" min={Math.max(branches, p.limits.minBranches)} max={p.limits.maxBranches} defaultValue={Math.max(branches, p.limits.minBranches)} className="mt-1" />
                      </label>
                    ) : null}
                    <Button className="w-full" variant={p.id === "pro" ? "primary" : "secondary"} disabled={!p.stripePriceId}>
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

const STATUS: Record<string, { label: string; tone: "good" | "warn" | "bad" | "neutral" }> = {
  active: { label: "Active", tone: "good" },
  trialing: { label: "Trial", tone: "good" },
  past_due: { label: "Payment overdue", tone: "warn" },
  unpaid: { label: "Unpaid", tone: "bad" },
  canceled: { label: "Cancelled", tone: "neutral" },
  incomplete: { label: "Payment needed", tone: "warn" },
};

function PortalButton({ flow, children, variant = "secondary" }: { flow?: string; children: React.ReactNode; variant?: "primary" | "secondary" | "ghost" }) {
  return (
    <form action="/api/stripe/portal" method="post">
      {flow ? <input type="hidden" name="flow" value={flow} /> : null}
      <Button type="submit" variant={variant}>{children}</Button>
    </form>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-hairline py-3 first:border-t-0">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-sm text-ink">{children}</dd>
    </div>
  );
}

function PaidPlan({
  planName,
  planId,
  limits,
  sub,
  branches,
  extraScansUsed,
  isOwner,
  orgName,
}: {
  planName: string;
  planId: PlanId;
  limits: PlanLimits;
  sub: { status: string; branch_quantity: number; current_period_end: string | null; cancel_at_period_end: boolean };
  branches: number;
  extraScansUsed: number | null;
  isOwner: boolean;
  orgName: string;
}) {
  const unit = PRICES_GBP[planId as keyof typeof PRICES_GBP] ?? 0;
  const perBranch = planId === "agency";
  const qty = perBranch ? Math.max(sub.branch_quantity, limits.minBranches) : 1;
  const monthly = unit * qty;
  const status = sub.cancel_at_period_end
    ? { label: `Ends ${formatDate(sub.current_period_end)}`, tone: "warn" as const }
    : (STATUS[sub.status] ?? { label: sub.status, tone: "neutral" as const });
  const extraAllowance = limits.manualScansPerMonth * branches;

  return (
    <div className="mb-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardBody className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-label uppercase text-ink-muted">Your plan</p>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <p className="text-title text-ink">
            {planName} <span className="text-ink-muted">·</span> £{monthly} a month
          </p>
          <p className="text-sm text-ink-muted">
            {perBranch ? `£${unit} per branch × ${qty} branches. ` : ""}
            {sub.cancel_at_period_end
              ? `Your plan ends on ${formatDate(sub.current_period_end)} and won't renew. Weekly scans stop then; your results stay viewable.`
              : `Next payment £${monthly} on ${formatDate(sub.current_period_end)}.`}
          </p>
          {sub.status === "past_due" ? (
            <p className="pt-2 text-sm text-warn">Your last payment didn&apos;t go through. Update your card to keep scans running.</p>
          ) : null}
        </CardBody>
        <CardBody className="border-t border-hairline">
          <p className="mb-1 text-label uppercase text-ink-muted">Included</p>
          <dl>
            <Row label="Assistants">
              <AssistantChips engines={limits.engines} />
            </Row>
            <Row label="Questions per branch">Up to {limits.promptsPerBranch}, asked {limits.runsPerPrompt} times each, every week</Row>
            <Row label="Neighbourhoods per branch">Up to {limits.maxAreas}</Row>
            <Row label="Branches">
              <span className="font-mono">{branches}</span> of <span className="font-mono">{limits.maxBranches}</span> in use
            </Row>
            <Row label="Extra scans">
              {limits.manualScansPerMonth
                ? `${Math.min(extraScansUsed ?? 0, extraAllowance)} of ${extraAllowance} used in the last ${MANUAL_SCAN_WINDOW_DAYS} days`
                : "Not included on Starter"}
            </Row>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <p className="text-label uppercase text-ink-muted">Manage</p>
          {isOwner ? (
            <>
              <div className="space-y-1">
                <PortalButton flow="update" variant="primary">{perBranch ? "Change plan or branches" : "Change plan"}</PortalButton>
                <p className="text-small text-ink-muted">
                  {perBranch
                    ? `Add a branch for £${unit} a month, or remove one. Stripe adjusts this month's bill automatically.`
                    : "Switch to Agency to track more than one branch. Stripe adjusts this month's bill automatically."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <PortalButton flow="payment">Update card</PortalButton>
                <PortalButton>Invoices</PortalButton>
              </div>
              {!sub.cancel_at_period_end ? (
                <div className="border-t border-hairline pt-4">
                  <PortalButton flow="cancel" variant="ghost">Cancel plan</PortalButton>
                  <p className="mt-1 text-small text-ink-muted">You keep everything until the end of the period you&apos;ve paid for.</p>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-ink-muted">Only an owner of {orgName} can change the plan or billing details.</p>
          )}
          <a href="/pricing" className="block text-sm text-brand hover:underline">Compare plans</a>
        </CardBody>
      </Card>
    </div>
  );
}

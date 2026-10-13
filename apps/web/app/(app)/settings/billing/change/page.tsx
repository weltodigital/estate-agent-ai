import Link from "next/link";
import { redirect } from "next/navigation";
import { engineLabel, MANUAL_SCAN_WINDOW_DAYS, planChangeImpact, type PlanChangeImpact } from "@privett/core";
import { AssistantChips } from "@/components/marketing/assistant-names";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrg } from "@/lib/auth";
import { getOrgSubscriptions, purchasablePlans } from "@/lib/billing";
import { limitsFor, loadPlanBranches, loadStripeSubscription } from "@/lib/plan-change";
import { PRICES_GBP } from "@/lib/seo";
import { cn, formatDate } from "@/lib/utils";

export const metadata = { title: "Change plan" };

type PaidPlanId = "starter" | "pro" | "agency";

const list = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

export default async function ChangePlanPage({ searchParams }: { searchParams: Promise<{ plan?: string; branches?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireOrg();
  if (ctx.role !== "owner") redirect("/settings/billing?error=owner");
  const sub = (await getOrgSubscriptions(ctx.org.id)).find((s) => ["active", "trialing", "past_due"].includes(s.status));
  if (!ctx.plan.paid || !sub) redirect("/settings/billing");

  const currentId = ctx.plan.planId as PaidPlanId;
  const currentQty = currentId === "agency" ? Math.max(sub.branch_quantity, 2) : 1;
  const [branches, stripeSub] = await Promise.all([loadPlanBranches(ctx.org.id), sub.stripe_subscription_id ? loadStripeSubscription(sub.stripe_subscription_id) : null]);
  const plans = purchasablePlans();

  const targetId = (plans.some((p) => p.id === sp.plan) ? sp.plan : null) as PaidPlanId | null;
  const target = targetId ? plans.find((p) => p.id === targetId)! : null;
  const targetQty =
    targetId === "agency"
      ? Math.min(Math.max(Number(sp.branches) || (currentId === "agency" ? currentQty : Math.max(branches.length, 2)), 2), target!.limits.maxBranches)
      : 1;
  const monthly = (id: PaidPlanId, qty: number) => PRICES_GBP[id] * qty;
  const same = targetId === currentId && targetQty === currentQty;
  const cheaper = targetId ? monthly(targetId, targetQty) < monthly(currentId, currentQty) : false;
  const impact = targetId && !same ? planChangeImpact(ctx.plan.limits, limitsFor(targetId, targetQty), branches) : null;
  const pending = stripeSub?.pending ?? null;
  const pendingPlan = pending?.planId ? plans.find((p) => p.id === pending.planId) : null;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/settings/billing" className="text-sm text-brand hover:underline">
        Back to plan and billing
      </Link>
      <PageHeader title="Change plan" description="Pick a plan to see exactly what changes for your branches before you confirm anything." />

      {pending && pendingPlan ? (
        <p className="mb-6 rounded-md bg-surface-sunken p-3 text-sm">
          You&apos;re already switching to {pendingPlan.name}
          {pendingPlan.id === "agency" ? ` (${pending.quantity} branches)` : ""} on {formatDate(pending.from)}. Choosing another plan here replaces that.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = p.id === currentId;
          const selected = p.id === targetId;
          return (
            <Link
              key={p.id}
              href={`/settings/billing/change?plan=${p.id}`}
              aria-current={selected ? "true" : undefined}
              className={cn(
                "ring-brand-focus block rounded-lg border bg-surface-raised p-5 transition-colors hover-fine:border-brand/60",
                selected ? "border-brand ring-1 ring-brand" : "border-hairline",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-ink">{p.name}</p>
                {isCurrent ? <Badge tone="brand">Current</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                <span className="font-mono text-ink">£{PRICES_GBP[p.id as PaidPlanId]}</span> {p.id === "agency" ? "per branch a month, from 2" : "a month"}
              </p>
              <AssistantChips engines={p.limits.engines} className="mt-3" />
              <ul className="mt-3 space-y-1 text-small text-ink-muted">
                <li>{p.limits.promptsPerBranch} questions per branch</li>
                <li>{p.limits.maxAreas} neighbourhoods per branch</li>
                <li>{p.limits.manualScansPerMonth ? `${p.limits.manualScansPerMonth} extra scan a month` : "Weekly scans only"}</li>
              </ul>
            </Link>
          );
        })}
      </div>

      {target && targetId ? (
        <Card className="mt-6">
          <CardBody className="space-y-5">
            {targetId === "agency" ? (
              <form method="get" className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="plan" value="agency" />
                <label className="block text-sm text-ink-muted">
                  Branches
                  <Input type="number" name="branches" min={2} max={target.limits.maxBranches} defaultValue={targetQty} className="mt-1 w-28 font-mono" />
                </label>
                <Button type="submit" variant="secondary">Update</Button>
                <p className="w-full text-small text-ink-muted">
                  You have {branches.length} {branches.length === 1 ? "branch" : "branches"} set up. £{PRICES_GBP.agency} a month for each branch you pay for.
                </p>
              </form>
            ) : null}

            {same ? (
              <p className="text-sm text-ink-muted">This is your current plan. Nothing to change.</p>
            ) : impact ? (
              <>
                <div>
                  <p className="text-label uppercase text-ink-muted">{cheaper ? "Downgrade" : "Upgrade"}</p>
                  <h2 className="mt-1 text-title text-ink">
                    Switching to {target.name}
                    {targetId === "agency" ? ` (${targetQty} branches)` : ""} {cheaper ? `on ${formatDate(sub.current_period_end)}` : "today"}
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    <span className="font-mono text-ink">£{monthly(targetId, targetQty)}</span> a month instead of{" "}
                    <span className="font-mono">£{monthly(currentId, currentQty)}</span>.{" "}
                    {cheaper
                      ? "Your current plan carries on until then."
                      : "You pay the difference for the rest of this billing period now."}
                  </p>
                </div>

                {impact.losesSomething ? (
                  <div>
                    <p className="text-sm font-semibold text-ink">{cheaper ? "After that:" : "What changes:"}</p>
                    <Losses impact={impact} />
                  </div>
                ) : null}
                <Gains impact={impact} branches={{ from: ctx.plan.limits.maxBranches, to: limitsFor(targetId, targetQty).maxBranches }} />

                <p className="text-sm text-ink-muted">Nothing is deleted. Switch back any time and everything picks back up.</p>

                <form action="/api/stripe/portal" method="post" className="space-y-2 border-t border-hairline pt-5">
                  <input type="hidden" name="flow" value="confirm" />
                  <input type="hidden" name="plan_id" value={targetId} />
                  <input type="hidden" name="quantity" value={targetQty} />
                  <input type="hidden" name="return_to" value={`/settings/billing/change?plan=${targetId}${targetId === "agency" ? `&branches=${targetQty}` : ""}`} />
                  <Button type="submit">Continue to confirm</Button>
                  <p className="text-small text-ink-muted">Stripe shows the final amount next. Nothing changes until you confirm there.</p>
                </form>
              </>
            ) : null}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

function Losses({ impact }: { impact: PlanChangeImpact }) {
  const items: React.ReactNode[] = [];
  if (impact.enginesLost.length) {
    const names = list(impact.enginesLost.map(engineLabel));
    items.push(
      <>
        <strong>{names} {impact.enginesLost.length === 1 ? "stops" : "stop"} being asked.</strong> Your past {names} answers stay in your history.
      </>,
    );
  }
  if (impact.branchesStopped.length) {
    items.push(
      <>
        <strong>
          {list(impact.branchesStopped.map((b) => b.name))} {impact.branchesStopped.length === 1 ? "stops" : "stop"} being scanned.
        </strong>{" "}
        {list(impact.branchesKept.map((b) => b.name))} {impact.branchesKept.length === 1 ? "carries" : "carry"} on (your oldest{" "}
        {impact.branchesKept.length === 1 ? "branch" : "branches"}). Past results stay viewable. To keep a different branch, archive the ones you don&apos;t need in
        their settings first.
      </>,
    );
  }
  for (const b of impact.branches) {
    const prefix = impact.branchesKept.length > 1 ? `${b.name}: ` : "";
    if (b.areasDropped.length) {
      const areaQs = b.promptsDropped.filter((p) => p.reason === "area").length;
      items.push(
        <>
          <strong>
            {prefix}
            {impact.maxAreas.to} neighbourhoods, not {impact.maxAreas.from}.
          </strong>{" "}
          {list(b.areasKept)} {b.areasKept.length === 1 ? "stays" : "stay"}; {list(b.areasDropped)} {b.areasDropped.length === 1 ? "stops" : "stop"}
          {areaQs ? `, along with ${areaQs} ${areaQs === 1 ? "question" : "questions"} about ${b.areasDropped.length === 1 ? "it" : "them"}` : ""}.{" "}
          <Link href={`/branches/${b.id}/settings#details`} className="text-brand hover:underline">
            Change which
          </Link>
        </>,
      );
    }
    const byCount = b.promptsDropped.filter((p) => p.reason === "count");
    if (byCount.length) {
      items.push(
        <>
          <strong>
            {prefix}
            {impact.promptsPerBranch.to} questions are tracked.
          </strong>{" "}
          The {byCount.length} newest stop being asked:
          <ul className="mt-1 list-disc space-y-0.5 pl-5 font-mono text-small text-ink-muted">
            {byCount.map((p) => (
              <li key={p.text}>{p.text}</li>
            ))}
          </ul>
          <Link href={`/branches/${b.id}/settings#questions`} className="text-brand hover:underline">
            Choose which to keep
          </Link>
        </>,
      );
    }
  }
  if (impact.manualScans.to < impact.manualScans.from) {
    items.push(
      <>
        <strong>{impact.manualScans.to ? `${impact.manualScans.to} extra scan a month` : "No extra scans."}</strong> Weekly scans carry on as normal.
      </>,
    );
  }
  return (
    <ul className="mt-2 space-y-3 text-sm text-ink">
      {items.map((item, i) => (
        <li key={i} className="border-l-2 border-warn/60 pl-3">
          {item}
        </li>
      ))}
    </ul>
  );
}

function Gains({ impact, branches }: { impact: PlanChangeImpact; branches: { from: number; to: number } }) {
  const items: string[] = [];
  if (impact.enginesGained.length) items.push(`${list(impact.enginesGained.map(engineLabel))} added to every scan.`);
  if (impact.promptsPerBranch.to > impact.promptsPerBranch.from) {
    const resumed = impact.branches.reduce((n, b) => n + b.promptsResumed, 0);
    items.push(
      `Up to ${impact.promptsPerBranch.to} questions per branch${resumed ? `; ${resumed} you've turned on but weren't being asked start again` : ""}.`,
    );
  }
  if (impact.maxAreas.to > impact.maxAreas.from) items.push(`Up to ${impact.maxAreas.to} neighbourhoods per branch.`);
  if (impact.manualScans.to > impact.manualScans.from) items.push(`${impact.manualScans.to} extra scan per branch every ${MANUAL_SCAN_WINDOW_DAYS} days.`);
  if (branches.to > branches.from) items.push(`Weekly scans for up to ${branches.to} branches.`);
  if (!items.length) return null;
  return (
    <div>
      <p className="text-sm font-semibold text-ink">You get:</p>
      <ul className="mt-2 space-y-2 text-sm text-ink">
        {items.map((t) => (
          <li key={t} className="border-l-2 border-brand pl-3">
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

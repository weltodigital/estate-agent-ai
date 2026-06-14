"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  SUBSCRIPTION_TIERS,
  type SubscriptionTier,
  type UsageEventType,
} from "@app/shared/constants";
import type {
  BillingStatusResponse,
  CheckoutSessionResponse,
  PortalSessionResponse,
} from "@app/shared/schemas";
import { Button } from "@app/ui";
import { billingApi } from "@/lib/queries";

const TIER_LABELS: Record<SubscriptionTier, string> = {
  starter: "Starter",
  pro: "Pro",
  business: "Business",
  agency: "Agency",
};

const EVENT_LABELS: Record<UsageEventType, string> = {
  listing_created: "Properties listed",
  photo_enhanced: "Photo enhancements",
  staging_generated: "Staging generations",
  floor_plan_created: "Floor plans",
  video_generated: "Videos",
  description_generated: "AI descriptions",
  epc_lookup: "EPC lookups",
};

export function BillingTab() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery<BillingStatusResponse>({
    queryKey: ["billing", "status"],
    queryFn: billingApi.status,
  });

  const checkout = useMutation<CheckoutSessionResponse, Error, SubscriptionTier>({
    mutationFn: (tier) =>
      billingApi.checkout({
        tier,
        success_url: `${window.location.origin}/settings?billing=success`,
        cancel_url: `${window.location.origin}/settings?billing=cancelled`,
      }),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
  });

  const portal = useMutation<PortalSessionResponse, Error, void>({
    mutationFn: () => billingApi.portal({ return_url: `${window.location.origin}/settings` }),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["billing", "status"] }),
  });

  if (isLoading) return <p className="text-brand-slate text-sm">Loading billing…</p>;
  if (isError) {
    return (
      <p role="alert" className="text-sm text-red-600">
        {(error as Error).message}
      </p>
    );
  }
  if (!data) return null;

  const trialDays = trialDaysLeft(data.trial_ends_at);

  return (
    <section className="space-y-6">
      {trialDays !== null && trialDays > 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">
            Trial: {trialDays} {trialDays === 1 ? "day" : "days"} left.
          </p>
          <p className="text-xs">
            Your card hasn&apos;t been charged yet. Upgrade below before the trial ends to keep
            going.
          </p>
        </div>
      ) : null}

      <div className="border-brand-stone bg-brand-cream rounded-lg border p-4">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-brand-slate text-xs uppercase tracking-wide">Current plan</p>
            <p className="text-brand-ink font-serif text-[22px] font-medium">
              {TIER_LABELS[data.subscription_tier]}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => portal.mutate()}
              disabled={portal.isPending || !data.stripe_customer_id}
            >
              {portal.isPending ? "Opening portal…" : "Manage subscription"}
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {SUBSCRIPTION_TIERS.map((tier) => {
            const isCurrent = tier === data.subscription_tier;
            return (
              <button
                key={tier}
                type="button"
                onClick={() => checkout.mutate(tier)}
                disabled={isCurrent || checkout.isPending}
                className={`rounded-md border p-3 text-left text-sm transition-colors ${
                  isCurrent
                    ? "bg-brand-bone border-[color:var(--brand-primary)]"
                    : "border-brand-stone hover:border-brand-walnut/50"
                } ${checkout.isPending ? "opacity-50" : ""}`}
              >
                <p className="font-medium">{TIER_LABELS[tier]}</p>
                <p className="text-brand-slate mt-1 text-xs">
                  {isCurrent ? "Current plan" : "Switch to this plan"}
                </p>
              </button>
            );
          })}
        </div>

        {checkout.isError ? (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {(checkout.error as Error).message}
          </p>
        ) : null}
        {portal.isError ? (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {(portal.error as Error).message}
          </p>
        ) : null}
      </div>

      <div className="border-brand-stone bg-brand-cream rounded-lg border p-4">
        <header className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-brand-slate text-xs uppercase tracking-wide">Usage this month</p>
            <p className="text-brand-slate text-sm">
              Resets on{" "}
              {new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(
                nextMonthStart(new Date(data.period_start)),
              )}
              .
            </p>
          </div>
        </header>
        <ul className="space-y-3">
          {data.usage.map((u) => {
            const pct = u.limit > 0 ? Math.min(100, (u.used / u.limit) * 100) : 0;
            return (
              <li key={u.event_type} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{EVENT_LABELS[u.event_type]}</span>
                  <span className="text-brand-slate text-xs">
                    {u.used} / {u.limit}
                  </span>
                </div>
                <div className="bg-brand-stone/40 h-2 w-full overflow-hidden rounded">
                  <div
                    className={`h-full ${
                      pct >= 100
                        ? "bg-red-500"
                        : pct >= 80
                          ? "bg-amber-500"
                          : "bg-[color:var(--brand-primary)]"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function trialDaysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const ends = new Date(trialEndsAt).getTime();
  const now = Date.now();
  if (ends <= now) return 0;
  return Math.ceil((ends - now) / (1000 * 60 * 60 * 24));
}

function nextMonthStart(periodStart: Date): Date {
  return new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 1));
}

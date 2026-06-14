"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, FileText, ImagePlus, Sparkles, type LucideIcon } from "lucide-react";
import { type PropertyStatus, type UsageEventType } from "@app/shared/constants";
import type { BillingStatusResponse, Property } from "@app/shared/schemas";
import { Button } from "@app/ui";
import { agencyApi, billingApi, propertyApi, queryKeys } from "@/lib/queries";

const STATUS_LABELS: Record<PropertyStatus, string> = {
  draft: "Draft",
  active: "Active",
  under_offer: "Under offer",
  sold: "Sold",
  let: "Let",
  withdrawn: "Withdrawn",
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

export function DashboardHome() {
  const agency = useQuery({ queryKey: ["agency", "me"], queryFn: agencyApi.me });

  const recent = useQuery({
    queryKey: queryKeys.properties({ limit: 5, offset: 0 }),
    queryFn: () => propertyApi.list({ limit: 5, offset: 0 }),
  });

  const billing = useQuery<BillingStatusResponse>({
    queryKey: ["billing", "status"],
    queryFn: billingApi.status,
  });

  const trialDays = trialDaysLeft(billing.data?.trial_ends_at ?? null);

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-brand-ink font-serif text-[32px]">Dashboard</h1>
          <p className="text-brand-slate text-sm">
            {agency.data ? `Welcome back to ${agency.data.name}.` : "Welcome back."}
          </p>
        </div>
        <Button asChild>
          <a href="/properties/new">New property</a>
        </Button>
      </header>

      {trialDays !== null && trialDays > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p>
            <span className="font-medium">
              Trial: {trialDays} {trialDays === 1 ? "day" : "days"} left.
            </span>{" "}
            Your card hasn&apos;t been charged yet.
          </p>
          <a href="/settings?tab=billing" className="font-medium underline">
            Choose a plan
          </a>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Building2}
          label="Total properties"
          value={recent.isLoading ? null : (recent.data?.total ?? 0)}
        />
        <StatCard
          icon={ImagePlus}
          label="Photos enhanced"
          value={usageLabel(billing.data, "photo_enhanced")}
          hint="this month"
        />
        <StatCard
          icon={FileText}
          label="AI descriptions"
          value={usageLabel(billing.data, "description_generated")}
          hint="this month"
        />
        <StatCard
          icon={Sparkles}
          label="Virtual stagings"
          value={usageLabel(billing.data, "staging_generated")}
          hint="this month"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent properties */}
        <div className="lg:col-span-2">
          <div className="bg-brand-cream shadow-card rounded-xl">
            <header className="border-brand-stone flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-brand-ink font-serif text-lg font-medium">Recent properties</h2>
              <a href="/properties" className="text-brand-hedge text-xs font-medium">
                View all
              </a>
            </header>
            {recent.isError ? (
              <p role="alert" className="px-4 py-6 text-sm text-red-600">
                {(recent.error as Error).message}
              </p>
            ) : recent.isLoading ? (
              <p className="text-brand-slate px-4 py-6 text-sm">Loading…</p>
            ) : recent.data && recent.data.items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-brand-slate text-sm">No listings yet.</p>
                <a
                  href="/properties/new"
                  className="text-brand-hedge mt-2 inline-block text-sm font-medium"
                >
                  Add your first one →
                </a>
              </div>
            ) : (
              <ul className="divide-brand-stone divide-y">
                {recent.data?.items.map((p) => (
                  <li key={p.id}>
                    <a
                      href={`/properties/${p.id}`}
                      className="hover:bg-brand-stone/30 flex items-center justify-between px-4 py-3"
                    >
                      <div className="space-y-0.5">
                        <p className="font-medium">{p.address_line_1}</p>
                        <p className="text-brand-slate text-sm">
                          {p.town} · {p.postcode} · {p.bedrooms} bed
                        </p>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <p className="font-medium">{formatPrice(p.price_pence, p.listing_type)}</p>
                        <p className="text-brand-slate text-xs">{STATUS_LABELS[p.status]}</p>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Usage this month */}
        <div className="bg-brand-cream shadow-card rounded-xl">
          <header className="border-brand-stone flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-brand-ink font-serif text-lg font-medium">Usage this month</h2>
            <a href="/settings?tab=billing" className="text-brand-hedge text-xs font-medium">
              Billing
            </a>
          </header>
          <div className="px-4 py-4">
            {billing.isError ? (
              <p role="alert" className="text-sm text-red-600">
                {(billing.error as Error).message}
              </p>
            ) : billing.isLoading ? (
              <p className="text-brand-slate text-sm">Loading…</p>
            ) : (
              <ul className="space-y-3">
                {(billing.data?.usage ?? [])
                  .filter((u) => u.limit > 0)
                  .map((u) => {
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
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number | null;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="bg-brand-cream shadow-card rounded-xl p-5">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="text-brand-slate h-4 w-4" strokeWidth={1.5} aria-hidden /> : null}
        <p className="text-brand-slate text-xs font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-brand-ink mt-2 text-[28px] font-medium tabular-nums">
        {value === null ? "…" : value}
      </p>
      {hint ? <p className="text-brand-slate text-xs">{hint}</p> : null}
    </div>
  );
}

function usageLabel(
  data: BillingStatusResponse | undefined,
  eventType: UsageEventType,
): string | null {
  if (!data) return null;
  const row = data.usage.find((u) => u.event_type === eventType);
  if (!row) return "N/A";
  return `${row.used} / ${row.limit}`;
}

function trialDaysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const ends = new Date(trialEndsAt).getTime();
  const now = Date.now();
  if (ends <= now) return 0;
  return Math.ceil((ends - now) / (1000 * 60 * 60 * 24));
}

function formatPrice(pence: number, listingType: Property["listing_type"]): string {
  const formatted = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(pence / 100);
  return listingType === "rent" ? `${formatted} pcm` : formatted;
}

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { PROPERTY_STATUSES, type PropertyStatus } from "@app/shared/constants";
import { Button } from "@app/ui";
import { queryKeys, propertyApi } from "@/lib/queries";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_LABELS: Record<PropertyStatus, string> = {
  draft: "Draft",
  active: "Active",
  under_offer: "Under offer",
  sold: "Sold",
  let: "Let",
  withdrawn: "Withdrawn",
};

export function PropertyList() {
  const [status, setStatus] = useState<PropertyStatus | "all">("all");
  const [q, setQ] = useState("");

  const query = useQuery({
    queryKey: queryKeys.properties({
      status: status === "all" ? undefined : status,
      q,
      limit: 50,
      offset: 0,
    }),
    queryFn: () =>
      propertyApi.list({
        status: status === "all" ? undefined : status,
        q: q || undefined,
        limit: 50,
        offset: 0,
      }),
    placeholderData: (prev) => prev,
  });

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-brand-ink font-serif text-[32px]">Properties</h1>
          <p className="text-brand-slate text-sm">Your listings and where each one is up to.</p>
        </div>
        <Button asChild>
          <a href="/properties/new">New property</a>
        </Button>
      </header>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search address, town, postcode…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="border-brand-stone bg-brand-cream h-10 min-w-[16rem] flex-1 rounded-md border px-3 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as PropertyStatus | "all")}
          className="border-brand-stone bg-brand-cream h-10 rounded-md border px-3 text-sm"
        >
          <option value="all">All statuses</option>
          {PROPERTY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {query.isError ? (
        <p role="alert" className="text-sm text-red-600">
          {(query.error as Error).message}
        </p>
      ) : null}

      {query.isLoading ? (
        <p className="text-brand-slate text-sm">Loading…</p>
      ) : query.data && query.data.items.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No properties yet"
          subtitle="Add your first property to start building its listing."
          action={
            <Button asChild>
              <a href="/properties/new">New property</a>
            </Button>
          }
        />
      ) : (
        <ul className="bg-brand-cream divide-brand-stone shadow-card divide-y overflow-hidden rounded-xl">
          {query.data?.items.map((p) => (
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
    </section>
  );
}

function formatPrice(pence: number, listingType: "sale" | "rent"): string {
  const pounds = pence / 100;
  const formatted = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(pounds);
  return listingType === "rent" ? `${formatted} pcm` : formatted;
}

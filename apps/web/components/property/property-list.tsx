"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { PROPERTY_STATUSES, type PropertyStatus } from "@app/shared/constants";
import type { PropertySortField } from "@app/shared/schemas";
import { Button } from "@app/ui";
import { queryKeys, propertyApi } from "@/lib/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { PropertyStatsBadges } from "@/components/property/property-stats-badges";

const STATUS_LABELS: Record<PropertyStatus, string> = {
  draft: "Draft",
  active: "Active",
  under_offer: "Under offer",
  sold: "Sold",
  let: "Let",
  withdrawn: "Withdrawn",
};

// Each option packs the sort field + direction into one value for the dropdown.
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "created_at:desc", label: "Newest first" },
  { value: "created_at:asc", label: "Oldest first" },
  { value: "price:desc", label: "Price: high to low" },
  { value: "price:asc", label: "Price: low to high" },
  { value: "status:asc", label: "Status" },
  { value: "virtual_stagings:desc", label: "Most virtual stagings" },
  { value: "photo_enhancements:desc", label: "Most enhancements" },
];

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

// Sale-price brackets (in pounds) for the min/max dropdowns.
const PRICE_BRACKETS = [
  50_000, 75_000, 100_000, 125_000, 150_000, 175_000, 200_000, 250_000, 300_000, 350_000, 400_000,
  450_000, 500_000, 600_000, 700_000, 800_000, 900_000, 1_000_000, 1_250_000, 1_500_000, 2_000_000,
  3_000_000, 5_000_000,
];

const priceFormat = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const inputClass = "border-brand-stone bg-brand-cream h-10 rounded-md border px-3 text-sm";

export function PropertyList() {
  const [status, setStatus] = useState<PropertyStatus | "all">("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("created_at:desc");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [hasStaging, setHasStaging] = useState(false);
  const [hasEnhancements, setHasEnhancements] = useState(false);

  const [sortField, order] = sort.split(":") as [PropertySortField, "asc" | "desc"];

  // Fetch the agency's listings once with a stable key, then sort and filter in
  // the browser so every control responds instantly instead of round-tripping
  // to the API on each change. The stats needed for the count filters/sorts are
  // already in this one response.
  const query = useQuery({
    queryKey: queryKeys.properties({ limit: 1000 }),
    queryFn: () => propertyApi.list({ limit: 1000 }),
    placeholderData: (prev) => prev,
  });

  const visible = useMemo(() => {
    const minPence = minPrice ? Math.round(Number(minPrice) * 100) : undefined;
    const maxPence = maxPrice ? Math.round(Number(maxPrice) * 100) : undefined;
    const createdAfter = createdFrom ? `${createdFrom}T00:00:00.000Z` : undefined;
    const createdBefore = createdTo ? `${createdTo}T23:59:59.999Z` : undefined;
    const term = q.trim().toLowerCase();

    const filtered = (query.data?.items ?? []).filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (minPence !== undefined && p.price_pence < minPence) return false;
      if (maxPence !== undefined && p.price_pence > maxPence) return false;
      if (createdAfter && p.created_at < createdAfter) return false;
      if (createdBefore && p.created_at > createdBefore) return false;
      if (hasStaging && p.stats.virtual_stagings === 0) return false;
      if (hasEnhancements && p.stats.photo_enhancements === 0) return false;
      if (term && !`${p.address_line_1} ${p.town} ${p.postcode}`.toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });

    const byCreatedAt = (a: (typeof filtered)[number], b: (typeof filtered)[number]) =>
      a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
    const direction = order === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let cmp: number;
      switch (sortField) {
        case "price":
          cmp = a.price_pence - b.price_pence;
          break;
        case "status":
          cmp = PROPERTY_STATUSES.indexOf(a.status) - PROPERTY_STATUSES.indexOf(b.status);
          break;
        case "virtual_stagings":
          cmp = a.stats.virtual_stagings - b.stats.virtual_stagings;
          break;
        case "photo_enhancements":
          cmp = a.stats.photo_enhancements - b.stats.photo_enhancements;
          break;
        default:
          cmp = byCreatedAt(a, b);
      }
      return (cmp !== 0 ? cmp : byCreatedAt(a, b)) * direction;
    });
  }, [
    query.data,
    status,
    q,
    sortField,
    order,
    minPrice,
    maxPrice,
    createdFrom,
    createdTo,
    hasStaging,
    hasEnhancements,
  ]);

  const hasAnyProperties = (query.data?.items.length ?? 0) > 0;

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

      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <input
            type="search"
            placeholder="Search address, town, postcode…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={`${inputClass} min-w-[16rem] flex-1`}
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as PropertyStatus | "all")}
            className={inputClass}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            {PROPERTY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className={inputClass}
            aria-label="Sort properties"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className={inputClass}
            aria-label="Minimum price"
          >
            <option value="">No min price</option>
            {PRICE_BRACKETS.map((v) => (
              <option key={v} value={v}>
                {priceFormat.format(v)}
              </option>
            ))}
          </select>
          <select
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className={inputClass}
            aria-label="Maximum price"
          >
            <option value="">No max price</option>
            {PRICE_BRACKETS.map((v) => (
              <option key={v} value={v}>
                {priceFormat.format(v)}
              </option>
            ))}
          </select>
          <label className="text-brand-walnut flex items-center gap-2 text-sm">
            <span className="text-brand-slate">Added from</span>
            <input
              type="date"
              value={createdFrom}
              onChange={(e) => setCreatedFrom(e.target.value)}
              className={inputClass}
              aria-label="Created on or after"
            />
          </label>
          <label className="text-brand-walnut flex items-center gap-2 text-sm">
            <span className="text-brand-slate">to</span>
            <input
              type="date"
              value={createdTo}
              onChange={(e) => setCreatedTo(e.target.value)}
              className={inputClass}
              aria-label="Created on or before"
            />
          </label>
          <label className="text-brand-walnut flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hasStaging}
              onChange={(e) => setHasStaging(e.target.checked)}
            />
            Has virtual staging
          </label>
          <label className="text-brand-walnut flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hasEnhancements}
              onChange={(e) => setHasEnhancements(e.target.checked)}
            />
            Has enhancements
          </label>
        </div>
      </div>

      {query.isError ? (
        <p role="alert" className="text-sm text-red-600">
          {(query.error as Error).message}
        </p>
      ) : null}

      {query.isLoading ? (
        <p className="text-brand-slate text-sm">Loading…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={hasAnyProperties ? "No matching properties" : "No properties yet"}
          subtitle={
            hasAnyProperties
              ? "No listings match these filters. Try clearing them."
              : "Add your first property to start building its listing."
          }
          action={
            <Button asChild>
              <a href="/properties/new">New property</a>
            </Button>
          }
        />
      ) : (
        <ul className="bg-brand-cream divide-brand-stone shadow-card divide-y overflow-hidden rounded-xl">
          {visible.map((p) => (
            <li key={p.id}>
              <a
                href={`/properties/${p.id}`}
                className="hover:bg-brand-stone/30 flex items-center justify-between px-4 py-3"
              >
                <div className="space-y-1.5">
                  <div className="space-y-0.5">
                    <p className="font-medium">{p.address_line_1}</p>
                    <p className="text-brand-slate text-sm">
                      {p.town} · {p.postcode} · {p.bedrooms} bed
                    </p>
                  </div>
                  <PropertyStatsBadges stats={p.stats} />
                </div>
                <div className="space-y-0.5 text-right">
                  <p className="font-medium">{formatPrice(p.price_pence, p.listing_type)}</p>
                  <p className="text-brand-slate text-xs">{STATUS_LABELS[p.status]}</p>
                  <p className="text-brand-slate text-xs">
                    Added {dateFormat.format(new Date(p.created_at))}
                  </p>
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

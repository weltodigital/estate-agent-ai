"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PROPERTY_STATUSES, type PropertyStatus } from "@app/shared/constants";
import { queryKeys, propertyApi } from "@/lib/queries";
import { EMPTY_STATES } from "@/lib/copy";

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
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Properties</h1>
        <a
          href="/properties/new"
          className="rounded-md bg-[color:var(--brand-primary)] px-3 py-2 text-sm font-medium text-white"
        >
          New property
        </a>
      </header>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search address, town, postcode…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-10 min-w-[16rem] flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as PropertyStatus | "all")}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
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
        <p className="text-sm text-slate-500">Loading…</p>
      ) : query.data && query.data.items.length === 0 ? (
        <p className="text-sm text-slate-500">{EMPTY_STATES.properties}</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {query.data?.items.map((p) => (
            <li key={p.id}>
              <a
                href={`/properties/${p.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
              >
                <div className="space-y-0.5">
                  <p className="font-medium">{p.address_line_1}</p>
                  <p className="text-sm text-slate-500">
                    {p.town} · {p.postcode} · {p.bedrooms} bed
                  </p>
                </div>
                <div className="space-y-0.5 text-right">
                  <p className="font-medium">{formatPrice(p.price_pence, p.listing_type)}</p>
                  <p className="text-xs text-slate-500">{STATUS_LABELS[p.status]}</p>
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

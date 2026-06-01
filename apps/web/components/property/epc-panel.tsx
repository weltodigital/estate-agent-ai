"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EpcRating } from "@app/shared/constants";
import type { EpcRecord, Property } from "@app/shared/schemas";
import { Button } from "@app/ui";
import { epcApi, propertyApi, queryKeys } from "@/lib/queries";

const RATING_COLOURS: Record<EpcRating, string> = {
  A: "bg-emerald-600",
  B: "bg-green-500",
  C: "bg-lime-500",
  D: "bg-yellow-500",
  E: "bg-amber-500",
  F: "bg-orange-500",
  G: "bg-red-500",
};

export function EpcPanel({ property }: { property: Property }) {
  const queryClient = useQueryClient();

  const search = useQuery({
    queryKey: queryKeys.epc(property.postcode),
    queryFn: () => epcApi.lookup(property.postcode),
    enabled: false,
  });

  const apply = useMutation({
    mutationFn: (record: EpcRecord) =>
      propertyApi.update(property.id, {
        epc_current_rating: record.current_rating,
        epc_potential_rating: record.potential_rating,
        epc_expiry_date: record.expiry_date,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.property(property.id), updated);
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });

  const clear = useMutation({
    mutationFn: () =>
      propertyApi.update(property.id, {
        epc_current_rating: null,
        epc_potential_rating: null,
        epc_expiry_date: null,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.property(property.id), updated);
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Current EPC</h2>
          {property.epc_current_rating ? (
            <button
              type="button"
              onClick={() => clear.mutate()}
              className="text-sm text-slate-500 underline"
              disabled={clear.isPending}
            >
              Clear
            </button>
          ) : null}
        </header>
        {property.epc_current_rating ? (
          <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
            <Stat label="Current rating">
              <RatingBadge rating={property.epc_current_rating} />
            </Stat>
            <Stat label="Potential rating">
              {property.epc_potential_rating ? (
                <RatingBadge rating={property.epc_potential_rating} />
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </Stat>
            <Stat label="Valid until">
              <span>{property.epc_expiry_date ?? "—"}</span>
            </Stat>
          </dl>
        ) : (
          <p className="text-sm text-slate-500">No EPC linked yet. Search for one below.</p>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">EPC Register lookup</h2>
          <Button variant="outline" onClick={() => search.refetch()} disabled={search.isFetching}>
            {search.isFetching ? "Searching…" : `Look up ${property.postcode}`}
          </Button>
        </header>

        {search.isError ? (
          <p role="alert" className="text-sm text-red-600">
            {(search.error as Error).message}
          </p>
        ) : null}

        {search.data ? (
          search.data.results.length === 0 ? (
            <p className="text-sm text-slate-500">No EPCs found for {property.postcode}.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {search.data.results.map((record, idx) => (
                <li
                  key={`${record.address}-${idx}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{record.address}</p>
                    <p className="text-xs text-slate-500">
                      Valid until {record.expiry_date ?? "—"}
                      {record.inspection_date ? ` · inspected ${record.inspection_date}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <RatingBadge rating={record.current_rating} />
                    {record.potential_rating ? (
                      <span className="text-xs text-slate-500">
                        → <RatingBadge rating={record.potential_rating} small />
                      </span>
                    ) : null}
                    <Button onClick={() => apply.mutate(record)} disabled={apply.isPending}>
                      Use this
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : (
          <p className="text-sm text-slate-500">
            Click look up to fetch certificates for this postcode.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function RatingBadge({ rating, small = false }: { rating: EpcRating; small?: boolean }) {
  return (
    <span
      className={`${RATING_COLOURS[rating]} inline-flex ${small ? "h-5 w-5 text-xs" : "h-7 w-7 text-sm"} items-center justify-center rounded font-semibold text-white`}
    >
      {rating}
    </span>
  );
}

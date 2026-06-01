"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PropertyStatus } from "@app/shared/constants";
import { Button } from "@app/ui";
import { propertyApi, queryKeys } from "@/lib/queries";
import { EpcPanel } from "./epc-panel";
import { PhotoManager } from "./photo-manager";

const TABS = [
  { key: "photos", label: "Photos" },
  { key: "description", label: "Description" },
  { key: "floor_plan", label: "Floor plan" },
  { key: "epc", label: "EPC" },
  { key: "activity", label: "Activity" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const STATUS_LABELS: Record<PropertyStatus, string> = {
  draft: "Draft",
  active: "Active",
  under_offer: "Under offer",
  sold: "Sold",
  let: "Let",
  withdrawn: "Withdrawn",
};

export function PropertyDetail({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("photos");

  const query = useQuery({
    queryKey: queryKeys.property(propertyId),
    queryFn: () => propertyApi.get(propertyId),
  });

  const archive = useMutation({
    mutationFn: () => propertyApi.archive(propertyId),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.property(propertyId), data);
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });

  if (query.isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (query.isError)
    return (
      <p role="alert" className="text-sm text-red-600">
        {(query.error as Error).message}
      </p>
    );
  if (!query.data) return null;

  const property = query.data;

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{property.address_line_1}</h1>
          <p className="text-sm text-slate-500">
            {property.town} · {property.postcode} · {STATUS_LABELS[property.status]}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/properties/${propertyId}/edit`}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            Edit
          </a>
          {property.status !== "withdrawn" ? (
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("Archive this property?")) archive.mutate();
              }}
              disabled={archive.isPending}
            >
              {archive.isPending ? "Archiving…" : "Archive"}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={async () => {
                if (confirm("Permanently delete this property?")) {
                  await propertyApi.remove(propertyId);
                  router.push("/properties");
                  router.refresh();
                }
              }}
            >
              Delete
            </Button>
          )}
        </div>
      </header>

      <nav className="flex gap-4 border-b border-slate-200 text-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-1 py-2 ${
              tab === t.key
                ? "border-[color:var(--brand-primary)] font-medium text-slate-900"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="pt-2">
        {tab === "photos" ? <PhotoManager propertyId={propertyId} /> : null}
        {tab === "description" ? (
          <Placeholder>Description editor lands in feature prompt 4.</Placeholder>
        ) : null}
        {tab === "floor_plan" ? (
          <Placeholder>Floor plan editor lands in feature prompt 7.</Placeholder>
        ) : null}
        {tab === "epc" ? <EpcPanel property={property} /> : null}
        {tab === "activity" ? <Placeholder>Activity log lands later.</Placeholder> : null}
      </div>
    </section>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
      {children}
    </div>
  );
}

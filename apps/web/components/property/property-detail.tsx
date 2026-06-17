"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PropertyStatus } from "@app/shared/constants";
import { Button } from "@app/ui";
import { propertyApi, queryKeys } from "@/lib/queries";
import { ActivityPanel } from "./activity-panel";
import { DescriptionPanel } from "./description-panel";
import { EpcPanel } from "./epc-panel";
import { FloorPlanPanel } from "./floor-plan-panel";
import { PhotoManager } from "./photo-manager";

const TABS = [
  { key: "enhancements", label: "Enhancements" },
  { key: "virtual_staging", label: "Virtual staging" },
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
  const [tab, setTab] = useState<TabKey>("enhancements");

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

  if (query.isLoading) return <p className="text-brand-slate text-sm">Loading…</p>;
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
          <h1 className="text-brand-ink text-[32px] leading-tight">{property.address_line_1}</h1>
          <p className="text-brand-slate text-sm">
            {property.town} · {property.postcode} · {STATUS_LABELS[property.status]}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/properties/${propertyId}/edit`}
            className="border-brand-stone rounded-md border px-3 py-2 text-sm"
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

      <nav className="border-brand-stone flex gap-4 border-b text-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-1 py-2 ${
              tab === t.key
                ? "text-brand-ink border-[color:var(--brand-primary)] font-medium"
                : "text-brand-walnut hover:text-brand-ink border-transparent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="pt-2">
        {tab === "enhancements" ? (
          <PhotoManager propertyId={propertyId} category="enhancement" />
        ) : null}
        {tab === "virtual_staging" ? (
          <PhotoManager propertyId={propertyId} category="staging" />
        ) : null}
        {tab === "description" ? <DescriptionPanel property={property} /> : null}
        {tab === "floor_plan" ? <FloorPlanPanel propertyId={propertyId} /> : null}
        {tab === "epc" ? <EpcPanel property={property} /> : null}
        {tab === "activity" ? <ActivityPanel propertyId={propertyId} /> : null}
      </div>
    </section>
  );
}

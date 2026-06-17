"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, History, Leaf, Ruler, Sofa, Sparkles } from "lucide-react";
import type { PropertyStatus } from "@app/shared/constants";
import { PROPERTY_STATUSES } from "@app/shared/constants";
import { Button } from "@app/ui";
import { propertyApi, queryKeys } from "@/lib/queries";
import { ActivityPanel } from "./activity-panel";
import { DescriptionPanel } from "./description-panel";
import { EpcPanel } from "./epc-panel";
import { FloorPlanPanel } from "./floor-plan-panel";
import { PhotoManager } from "./photo-manager";

const TABS = [
  { key: "enhancements", label: "Enhancements", icon: Sparkles },
  { key: "virtual_staging", label: "Virtual staging", icon: Sofa },
  { key: "description", label: "Description", icon: FileText },
  { key: "floor_plan", label: "Floor plan", icon: Ruler },
  { key: "epc", label: "EPC", icon: Leaf },
  { key: "activity", label: "Activity", icon: History },
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

  const updateStatus = useMutation({
    mutationFn: (status: PropertyStatus) => propertyApi.update(propertyId, { status }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.property(propertyId), data);
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      // Surface the logged status change in the Activity tab straight away.
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(propertyId) });
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
            {property.town} · {property.postcode}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="property-status">
            Property status
          </label>
          <select
            id="property-status"
            value={property.status}
            onChange={(event) => updateStatus.mutate(event.target.value as PropertyStatus)}
            disabled={updateStatus.isPending}
            className="border-brand-stone text-brand-ink rounded-md border bg-white px-3 py-2 text-sm disabled:opacity-60"
          >
            {PROPERTY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <a
            href={`/properties/${propertyId}/edit`}
            className="border-brand-stone rounded-md border px-3 py-2 text-sm"
          >
            Edit
          </a>
          {property.status === "withdrawn" ? (
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
          ) : null}
        </div>
      </header>

      <nav className="border-brand-stone flex gap-4 border-b text-sm">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-1 py-2 ${
              tab === key
                ? "text-brand-ink border-[color:var(--brand-primary)] font-medium"
                : "text-brand-walnut hover:text-brand-ink border-transparent"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            <span>{label}</span>
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

"use client";

import { useQuery } from "@tanstack/react-query";
import type { ActivityEventType, PropertyStatus } from "@app/shared/constants";
import type { PropertyActivityEvent } from "@app/shared/schemas";
import { propertyApi, queryKeys } from "@/lib/queries";

// UK English labels for each event the activity log can surface.
const EVENT_LABELS: Record<ActivityEventType, string> = {
  listing_created: "Property created",
  photo_enhanced: "Photo enhanced",
  staging_generated: "Virtual staging generated",
  floor_plan_created: "Floor plan created",
  video_generated: "Video generated",
  description_generated: "Description generated",
  epc_lookup: "EPC looked up",
  status_changed: "Status changed",
};

const STATUS_LABELS: Record<PropertyStatus, string> = {
  draft: "Draft",
  active: "Active",
  under_offer: "Under offer",
  sold: "Sold",
  let: "Let",
  withdrawn: "Withdrawn",
};

// Status changes carry their target in metadata.to — surface it inline.
function describeEvent(event: PropertyActivityEvent): string {
  if (event.event_type === "status_changed") {
    const to = event.metadata.to;
    if (to) return `Status changed to ${STATUS_LABELS[to as PropertyStatus] ?? to}`;
  }
  return EVENT_LABELS[event.event_type];
}

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function ActivityPanel({ propertyId }: { propertyId: string }) {
  const activity = useQuery({
    queryKey: queryKeys.activity(propertyId),
    queryFn: () => propertyApi.activity(propertyId),
  });

  if (activity.isLoading) {
    return <p className="text-brand-slate text-sm">Loading activity…</p>;
  }

  if (activity.isError) {
    return (
      <p role="alert" className="text-sm text-red-600">
        {(activity.error as Error).message}
      </p>
    );
  }

  const items = activity.data?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="border-brand-stone bg-brand-cream text-brand-slate rounded-md border border-dashed p-6 text-sm">
        No activity yet. Actions like enhancing a photo, generating virtual staging, or creating a
        floor plan will appear here.
      </div>
    );
  }

  return (
    <ol className="border-brand-stone bg-brand-cream overflow-hidden rounded-lg border">
      {items.map((event) => (
        <ActivityRow key={event.id} event={event} />
      ))}
    </ol>
  );
}

function ActivityRow({ event }: { event: PropertyActivityEvent }) {
  return (
    <li className="border-brand-stone flex items-start justify-between gap-4 border-b px-4 py-3 last:border-b-0">
      <div className="space-y-0.5">
        <p className="text-brand-ink text-sm font-medium">{describeEvent(event)}</p>
        <p className="text-brand-slate text-xs">{event.user_full_name ?? "A team member"}</p>
      </div>
      <time dateTime={event.created_at} className="text-brand-slate shrink-0 text-xs">
        {dateTimeFormat.format(new Date(event.created_at))}
      </time>
    </li>
  );
}

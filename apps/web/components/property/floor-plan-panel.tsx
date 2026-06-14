"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FloorPlan } from "@app/shared/schemas";
import { Button, Input, Label } from "@app/ui";
import { floorPlanApi, queryKeys } from "@/lib/queries";

const EDITABLE_STATUSES = new Set(["parsed", "editing", "finalised"]);

const STATUS_LABELS: Record<FloorPlan["status"], string> = {
  uploaded: "Uploaded",
  parsing: "Parsing…",
  parsed: "Parsed",
  editing: "Editing",
  finalised: "Finalised",
  failed: "Failed",
};

export function FloorPlanPanel({ propertyId }: { propertyId: string }) {
  void EDITABLE_STATUSES; // referenced below in JSX
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [floorLabel, setFloorLabel] = useState("Ground floor");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.floorPlans(propertyId),
    queryFn: () => floorPlanApi.list(propertyId),
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      const pending = items.some((p) => p.status === "parsing" || p.status === "uploaded");
      return pending ? 3000 : false;
    },
  });

  const plans = useMemo(() => data?.items ?? [], [data]);

  const retry = useMutation({
    mutationFn: (id: string) => floorPlanApi.parse(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.floorPlans(propertyId) }),
  });

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const { floor_plan, upload_url } = await floorPlanApi.create(propertyId, {
        floor_label: floorLabel || "Ground floor",
        filename: file.name,
        content_type: file.type || "image/jpeg",
        include_furniture: false,
      });
      const putRes = await fetch(upload_url, {
        method: "PUT",
        body: file,
        headers: { "content-type": file.type || "image/jpeg" },
      });
      if (!putRes.ok) {
        throw new Error(`Upload failed (${putRes.status})`);
      }
      await floorPlanApi.parse(floor_plan.id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.floorPlans(propertyId) });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <section className="space-y-6">
      <div className="border-brand-stone bg-brand-cream rounded-lg border p-4">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upload a sketch</h2>
        </header>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[14rem] flex-1 space-y-1">
            <Label htmlFor="floor_label">Floor label</Label>
            <Input
              id="floor_label"
              value={floorLabel}
              onChange={(e) => setFloorLabel(e.target.value)}
              placeholder="Ground floor"
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPick(e.target.files)}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : "Choose sketch"}
          </Button>
        </div>
        {uploadError ? (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {uploadError}
          </p>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading floor plans…</p>
      ) : plans.length === 0 ? (
        <p className="text-sm text-slate-500">No floor plans yet. Upload a sketch above.</p>
      ) : (
        <ul className="space-y-4">
          {plans.map((plan) => (
            <li
              key={plan.id}
              className="border-brand-stone bg-brand-cream rounded-lg border p-4 shadow-sm"
            >
              <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="font-medium">{plan.floor_label}</p>
                  <p className="text-xs text-slate-500">
                    Status: {STATUS_LABELS[plan.status]}
                    {plan.total_area_sqm ? ` · ${plan.total_area_sqm.toFixed(1)} m² total` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {plan.status === "failed" ? (
                    <Button
                      variant="outline"
                      onClick={() => retry.mutate(plan.id)}
                      disabled={retry.isPending}
                    >
                      {retry.isPending ? "Re-parsing…" : "Retry parse"}
                    </Button>
                  ) : null}
                  {EDITABLE_STATUSES.has(plan.status) ? (
                    <a
                      href={`/properties/${propertyId}/floor-plan/${plan.id}/edit`}
                      className="border-brand-stone rounded-md border px-3 py-2 text-sm"
                    >
                      Edit
                    </a>
                  ) : null}
                  {plan.output_pdf_url ? (
                    <a
                      href={plan.output_pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="border-brand-stone rounded-md border px-3 py-2 text-sm"
                    >
                      PDF
                    </a>
                  ) : null}
                  {plan.output_svg_url ? (
                    <a
                      href={plan.output_svg_url}
                      target="_blank"
                      rel="noreferrer"
                      className="border-brand-stone rounded-md border px-3 py-2 text-sm"
                    >
                      Open SVG
                    </a>
                  ) : null}
                </div>
              </header>

              {plan.status === "failed" ? (
                <div
                  role="alert"
                  className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                >
                  <p className="font-medium">Couldn&apos;t parse this sketch.</p>
                  <p>{plan.parse_error ?? "Unknown error."}</p>
                  <p className="mt-2 text-xs">
                    Tip: a clearer photo with straight walls and visible room labels parses best.
                  </p>
                </div>
              ) : plan.status === "parsing" || plan.status === "uploaded" ? (
                <div className="border-brand-stone flex aspect-[4/3] items-center justify-center rounded-md border border-dashed bg-slate-50 text-sm text-slate-500">
                  Claude is reading the sketch…
                </div>
              ) : plan.output_svg_url ? (
                <object
                  data={plan.output_svg_url}
                  type="image/svg+xml"
                  className="border-brand-stone bg-brand-cream aspect-[4/3] w-full rounded-md border"
                  aria-label={`${plan.floor_label} floor plan`}
                />
              ) : (
                <p className="text-sm text-slate-500">No render available.</p>
              )}

              <details className="mt-3 text-sm text-slate-500">
                <summary className="cursor-pointer">Original sketch</summary>
                <img src={plan.sketch_url} alt="" className="mt-2 max-h-96 rounded-md border" />
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

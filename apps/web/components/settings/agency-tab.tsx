"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FLOOR_PLAN_TEMPLATES,
  type FloorPlanTemplate,
  TONE_OPTIONS,
  type Tone,
  WATERMARK_POSITIONS,
  type WatermarkPosition,
} from "@app/shared/constants";
import type { Agency, UpdateAgencyRequest } from "@app/shared/schemas";
import { Button, Input, Label } from "@app/ui";
import { agencyApi } from "@/lib/queries";

const TONE_LABELS: Record<Tone, string> = {
  professional: "Professional",
  friendly: "Friendly",
  luxury: "Luxury",
  lettings: "Lettings",
};

const TEMPLATE_LABELS: Record<FloorPlanTemplate, string> = {
  minimal: "Minimal",
  classic: "Classic",
  bold: "Bold",
};

const WATERMARK_LABELS: Record<WatermarkPosition, string> = {
  "top-left": "Top left",
  "top-right": "Top right",
  "bottom-left": "Bottom left",
  "bottom-right": "Bottom right",
};

export function AgencyTab() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery<Agency>({
    queryKey: ["agency", "me"],
    queryFn: agencyApi.me,
  });

  const update = useMutation<Agency, Error, UpdateAgencyRequest>({
    mutationFn: agencyApi.update,
    onSuccess: (row) => queryClient.setQueryData(["agency", "me"], row),
  });

  const [name, setName] = useState("");
  const [tone, setTone] = useState<Tone>("professional");
  const [watermark, setWatermark] = useState<WatermarkPosition>("bottom-right");
  const [template, setTemplate] = useState<FloorPlanTemplate>("minimal");

  useEffect(() => {
    if (!data) return;
    setName(data.name);
    setTone(data.default_tone);
    setWatermark(data.default_watermark_position);
    setTemplate(data.floor_plan_template);
  }, [data]);

  if (isLoading) return <p className="text-brand-slate text-sm">Loading agency…</p>;
  if (isError)
    return (
      <p role="alert" className="text-sm text-red-600">
        {(error as Error).message}
      </p>
    );
  if (!data) return null;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate({
          name,
          default_tone: tone,
          default_watermark_position: watermark,
          floor_plan_template: template,
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="agency_name">Agency name</Label>
          <Input
            id="agency_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="slug">URL slug</Label>
          <Input id="slug" value={data.slug} disabled />
          <p className="text-brand-slate text-xs">Generated when you signed up; not editable.</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="tone">Default description tone</Label>
          <select
            id="tone"
            value={tone}
            onChange={(e) => setTone(e.target.value as Tone)}
            className="border-brand-stone bg-brand-cream h-10 w-full rounded-md border px-3 text-sm"
          >
            {TONE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {TONE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="watermark">Default watermark position</Label>
          <select
            id="watermark"
            value={watermark}
            onChange={(e) => setWatermark(e.target.value as WatermarkPosition)}
            className="border-brand-stone bg-brand-cream h-10 w-full rounded-md border px-3 text-sm"
          >
            {WATERMARK_POSITIONS.map((p) => (
              <option key={p} value={p}>
                {WATERMARK_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="template">Floor plan template</Label>
          <select
            id="template"
            value={template}
            onChange={(e) => setTemplate(e.target.value as FloorPlanTemplate)}
            className="border-brand-stone bg-brand-cream h-10 w-full rounded-md border px-3 text-sm"
          >
            {FLOOR_PLAN_TEMPLATES.map((t) => (
              <option key={t} value={t}>
                {TEMPLATE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {update.isError ? (
        <p role="alert" className="text-sm text-red-600">
          {(update.error as Error).message}
        </p>
      ) : null}
      {update.isSuccess ? <p className="text-sm text-emerald-700">Saved.</p> : null}

      <Button type="submit" disabled={update.isPending}>
        {update.isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

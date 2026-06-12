"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { STAGING_STYLES, type StagingStyle } from "@app/shared/constants";
import type { Photo, StagingVariation } from "@app/shared/schemas";
import { Button } from "@app/ui";
import { photoApi, queryKeys } from "@/lib/queries";
import { ImageLightbox } from "./image-lightbox";

const STYLE_LABELS: Record<StagingStyle, string> = {
  modern: "Modern",
  scandi: "Scandi",
  classic: "Classic",
  minimal: "Minimal",
  luxury: "Luxury",
  family: "Family",
};

export function StageDialog({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [style, setStyle] = useState<StagingStyle>(
    photo.staging_style ?? photo.suggested_style ?? "modern",
  );
  // Each variation costs one staging credit, so default to a single image and
  // let the agent spend more deliberately (up to the schema's max of 4; we cap
  // the picker at 3 to match the results grid).
  const [variationCount, setVariationCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  // URL of the staged image currently shown enlarged, if any.
  const [enlargedUrl, setEnlargedUrl] = useState<string | null>(null);

  const variations = photo.staging_variations ?? [];
  const isGenerating = variations.length === 0 && photo.staged_url === null;

  const generate = useMutation({
    mutationFn: () => photoApi.stage(photo.id, { style, variations: variationCount }),
    onSuccess: () => {
      // Trigger a poll loop — the photos query will pick up the new variations
      // once the callback lands. We don't optimistically write anything here.
      queryClient.invalidateQueries({ queryKey: queryKeys.photos(photo.property_id) });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not start staging."),
  });

  const select = useMutation({
    mutationFn: (variationId: string) => photoApi.selectStaging(photo.id, variationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.photos(photo.property_id) });
    },
  });

  const clear = useMutation({
    mutationFn: () => photoApi.clearStaging(photo.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.photos(photo.property_id) });
    },
  });

  const suggest = useMutation({
    mutationFn: () => photoApi.suggestStyle(photo.id),
    onSuccess: (res) => {
      setStyle(res.suggested_style);
      queryClient.invalidateQueries({ queryKey: queryKeys.photos(photo.property_id) });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not suggest a style."),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 py-12">
      <div className="max-h-[calc(100vh-6rem)] w-full max-w-3xl space-y-5 overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <header className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Virtual staging</h2>
            <p className="text-sm text-slate-500">
              Pick a style, generate three variations, then choose the one you like.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-slate-500">
            Close
          </button>
        </header>

        <div className="grid gap-3 md:grid-cols-[12rem_1fr]">
          <label className="space-y-1 text-sm">
            <span className="block font-medium">Style</span>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as StagingStyle)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              {STAGING_STYLES.map((s) => (
                <option key={s} value={s}>
                  {STYLE_LABELS[s]}
                </option>
              ))}
            </select>
            {photo.suggested_style ? (
              <span className="text-xs text-slate-500">
                Suggested: {STYLE_LABELS[photo.suggested_style]}
              </span>
            ) : null}
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <label className="space-y-1 text-sm">
              <span className="block font-medium">Variations</span>
              <select
                value={variationCount}
                onChange={(e) => setVariationCount(Number(e.target.value))}
                className="h-10 w-24 rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="outline" onClick={() => suggest.mutate()} disabled={suggest.isPending}>
              {suggest.isPending ? "Asking Claude…" : "Suggest style"}
            </Button>
            <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
              {generate.isPending
                ? "Queuing…"
                : `Generate (${variationCount} credit${variationCount > 1 ? "s" : ""})`}
            </Button>
            {variations.length > 0 ? (
              <Button variant="outline" onClick={() => clear.mutate()} disabled={clear.isPending}>
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}

        {variations.length === 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {Array.from({ length: variationCount }, (_, i) => (
              <Slot
                key={i}
                label={`Variation ${i + 1}`}
                pending={generate.isPending || isGenerating}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {variations
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((v) => (
                <VariationCard
                  key={v.id}
                  variation={v}
                  onPick={() => select.mutate(v.id)}
                  isPicking={select.isPending}
                  onEnlarge={() => setEnlargedUrl(v.url)}
                />
              ))}
          </div>
        )}

        {photo.staged_url ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            A staged image is saved for this photo. Picking another variation replaces it.
          </div>
        ) : null}
      </div>

      {enlargedUrl ? (
        <ImageLightbox src={enlargedUrl} alt="Staged image" onClose={() => setEnlargedUrl(null)} />
      ) : null}
    </div>
  );
}

function Slot({ label, pending }: { label: string; pending: boolean }) {
  return (
    <div className="flex aspect-[4/3] items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
      {pending ? "Rendering…" : label}
    </div>
  );
}

function VariationCard({
  variation,
  onPick,
  isPicking,
  onEnlarge,
}: {
  variation: StagingVariation;
  onPick: () => void;
  isPicking: boolean;
  onEnlarge: () => void;
}) {
  return (
    <div
      className={`overflow-hidden rounded-md border ${variation.selected ? "border-[color:var(--brand-primary)] ring-2 ring-[color:var(--brand-primary)]" : "border-slate-200"} bg-white shadow-sm`}
    >
      <button
        type="button"
        onClick={onEnlarge}
        aria-label="Enlarge staged image"
        className="block w-full cursor-zoom-in"
      >
        <img src={variation.url} alt="" className="aspect-[4/3] w-full object-cover" />
      </button>
      <div className="flex items-center justify-between px-3 py-2 text-xs">
        <span>{variation.selected ? "Selected" : "Variation"}</span>
        <Button
          variant={variation.selected ? "outline" : "default"}
          onClick={onPick}
          disabled={isPicking}
        >
          {variation.selected ? "Saved" : "Use this"}
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PhotoCategory } from "@app/shared/constants";
import {
  AUTO_ENHANCEMENTS,
  CREATIVE_ENHANCEMENTS,
  type Photo,
  type PhotoEnhancement,
} from "@app/shared/schemas";
import { Button } from "@app/ui";
import { photoApi, queryKeys } from "@/lib/queries";
import { BeforeAfterSlider } from "./before-after-slider";
import { StageDialog } from "./stage-dialog";
import { ObjectRemovalDialog } from "./object-removal-dialog";

// The creative dialog offers only deliberate, billable choices. Object removal
// is per-photo (it needs a painted mask), and sky replacement is hidden until a
// provider is wired — so the dialog is dusk + watermark.
const CREATIVE_DIALOG_ENHANCEMENTS = CREATIVE_ENHANCEMENTS.filter(
  (e) => e !== "object_removal" && e !== "sky_replacement",
);

const ENHANCEMENT_LABELS: Record<PhotoEnhancement, string> = {
  sky_replacement: "Sky replacement",
  object_removal: "Object removal",
  gdpr_blur: "GDPR blur (faces & plates)",
  exposure_correction: "Exposure correction",
  colour_temperature: "Colour temperature",
  colour_saturation: "Colour saturation",
  shadow_boost: "Boost shadows",
  hd_upscale: "HD upscale",
  logo_watermark: "Logo watermark",
  dusk_shot: "Dusk shot (extra image)",
};

export function PhotoManager({
  propertyId,
  category,
}: {
  propertyId: string;
  category: PhotoCategory;
}) {
  const isStaging = category === "staging";
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [chosen, setChosen] = useState<Set<PhotoEnhancement>>(new Set());
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [inFlight, setInFlight] = useState<Map<string, Set<PhotoEnhancement>>>(new Map());
  const [stageDialogPhotoId, setStageDialogPhotoId] = useState<string | null>(null);
  const [objectRemovalPhotoId, setObjectRemovalPhotoId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.photos(propertyId, category),
    queryFn: () => photoApi.list(propertyId, category),
    // Poll while enhancements are in flight, or while a stage dialog is open
    // waiting on a generation callback. Stops once nothing's pending.
    refetchInterval: inFlight.size > 0 || stageDialogPhotoId !== null ? 3000 : false,
  });

  const photos = data?.items ?? [];
  const stageDialogPhoto = stageDialogPhotoId
    ? (photos.find((p) => p.id === stageDialogPhotoId) ?? null)
    : null;
  const objectRemovalPhoto = objectRemovalPhotoId
    ? (photos.find((p) => p.id === objectRemovalPhotoId) ?? null)
    : null;

  function markInFlight(photoId: string, enhancement: PhotoEnhancement) {
    setInFlight((prev) => {
      const next = new Map(prev);
      const existing = next.get(photoId) ?? new Set<PhotoEnhancement>();
      existing.add(enhancement);
      next.set(photoId, existing);
      return next;
    });
  }

  // Clear in-flight markers once the photo row actually contains every
  // enhancement we asked for (the callback has landed).
  useMemo(() => {
    if (inFlight.size === 0) return;
    const next = new Map(inFlight);
    let changed = false;
    for (const photo of photos) {
      const wanted = next.get(photo.id);
      if (!wanted) continue;
      const have = new Set(photo.enhancements_applied);
      const stillMissing = [...wanted].some((e) => !have.has(e));
      if (!stillMissing) {
        next.delete(photo.id);
        changed = true;
      }
    }
    if (changed) setInFlight(next);
  }, [photos, inFlight]);

  const reorder = useMutation({
    mutationFn: (photoIds: string[]) => photoApi.reorder(propertyId, { photo_ids: photoIds }),
    onSuccess: (res) => {
      queryClient.setQueryData(queryKeys.photos(propertyId, category), res);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => photoApi.remove(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.photos(propertyId, category) }),
  });

  const revert = useMutation({
    mutationFn: (id: string) => photoApi.resetEnhancements(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.photos(propertyId, category) }),
  });

  const removeSelected = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((id) => photoApi.remove(id))),
    onSuccess: () => {
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: queryKeys.photos(propertyId, category) });
    },
    // On a partial failure some photos may already be gone — refresh so the
    // grid reflects the real state rather than the optimistic selection.
    onError: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.photos(propertyId, category) }),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(photos, oldIndex, newIndex);
    queryClient.setQueryData(queryKeys.photos(propertyId, category), { items: next });
    reorder.mutate(next.map((p) => p.id));
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploadingCount(files.length);
    try {
      const uploadedIds: string[] = [];
      for (const file of Array.from(files)) {
        const { photo, upload_url } = await photoApi.createUpload(propertyId, {
          filename: file.name,
          content_type: file.type || "image/jpeg",
          category,
        });
        const putRes = await fetch(upload_url, {
          method: "PUT",
          body: file,
          headers: { "content-type": file.type || "image/jpeg" },
        });
        if (!putRes.ok) {
          throw new Error(`Upload failed for ${file.name} (${putRes.status})`);
        }
        uploadedIds.push(photo.id);
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.photos(propertyId, category) });
      // Auto-clean enhancement photos in the background (free, reversible). The
      // orchestrator decides which of the safe bucket each photo actually needs.
      if (!isStaging) {
        for (const id of uploadedIds) {
          try {
            await photoApi.enhance(id, { enhancements: [...AUTO_ENHANCEMENTS] });
            // colour_saturation always applies, so it's a reliable in-flight
            // sentinel that clears once the callback lands.
            markInFlight(id, "colour_saturation");
          } catch {
            /* non-fatal — the photo still uploaded */
          }
        }
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingCount(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleChosen(value: PhotoEnhancement) {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  async function runEnhance(ids: string[]) {
    setEnhanceError(null);
    if (ids.length === 0 || chosen.size === 0) {
      setEnhanceError("Pick at least one photo and one enhancement.");
      return;
    }
    const creative = Array.from(chosen);
    try {
      // Each run re-derives from the original, so include the photo's existing
      // (auto) enhancements alongside the new creative ones to preserve cleanup.
      await Promise.all(
        ids.map((id) => {
          const photo = photos.find((p) => p.id === id);
          const current = (photo?.enhancements_applied ?? []) as PhotoEnhancement[];
          const enhancements = Array.from(new Set([...current, ...creative]));
          return photoApi.enhance(id, { enhancements });
        }),
      );
      // Mark only the creative ones in-flight — they reliably land in `applied`.
      setInFlight((prev) => {
        const next = new Map(prev);
        for (const id of ids) {
          const existing = next.get(id) ?? new Set<PhotoEnhancement>();
          for (const e of creative) existing.add(e);
          next.set(id, existing);
        }
        return next;
      });
      setSelected(new Set());
      setDialogOpen(false);
    } catch (err) {
      setEnhanceError(err instanceof Error ? err.message : "Could not enqueue enhancements.");
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {isStaging ? "Virtual staging" : "Photo enhancements"}
          </h2>
          <p className="text-xs text-slate-500">
            {isStaging
              ? "Upload empty rooms to furnish. Separate from your enhancement photos."
              : "Upload your listing photos to improve. Separate from your staging photos."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            {uploadingCount > 0 ? `Uploading ${uploadingCount}…` : "Upload photos"}
          </Button>
        </div>
      </div>

      {uploadError ? (
        <p role="alert" className="text-sm text-red-600">
          {uploadError}
        </p>
      ) : null}

      {!isStaging && selected.size > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-300 bg-slate-50 px-3 py-2">
          <span className="text-sm">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button onClick={() => setDialogOpen(true)}>Add creative enhancements</Button>
            <Button
              variant="destructive"
              disabled={removeSelected.isPending}
              onClick={() => {
                const ids = Array.from(selected);
                if (ids.length === 0) return;
                if (confirm(`Delete ${ids.length} photo${ids.length === 1 ? "" : "s"}?`)) {
                  removeSelected.mutate(ids);
                }
              }}
            >
              {removeSelected.isPending ? "Deleting…" : "Delete selected"}
            </Button>
            <Button variant="outline" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      {!isStaging && dialogOpen ? (
        <EnhanceDialog
          chosen={chosen}
          onToggle={toggleChosen}
          onClose={() => setDialogOpen(false)}
          onSubmit={() => runEnhance(Array.from(selected))}
        />
      ) : null}

      {!isStaging && enhanceError ? (
        <p role="alert" className="text-sm text-red-600">
          {enhanceError}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading photos…</p>
      ) : photos.length === 0 ? (
        <p className="text-sm text-slate-500">No photos yet. Upload to get started.</p>
      ) : isStaging ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <StagePhotoCard
              key={photo.id}
              photo={photo}
              onStage={() => setStageDialogPhotoId(photo.id)}
            />
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {photos.map((photo) => (
                <EnhancePhotoCard
                  key={photo.id}
                  photo={photo}
                  isSelected={selected.has(photo.id)}
                  isProcessing={inFlight.has(photo.id)}
                  onToggleSelect={() => toggleSelected(photo.id)}
                  onAddCreative={() => {
                    setDialogOpen(true);
                    setSelected(new Set([photo.id]));
                  }}
                  onRemoveObjects={() => setObjectRemovalPhotoId(photo.id)}
                  onRevert={() => revert.mutate(photo.id)}
                  onDelete={() => {
                    if (confirm("Delete this photo?")) remove.mutate(photo.id);
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {stageDialogPhoto ? (
        <StageDialog photo={stageDialogPhoto} onClose={() => setStageDialogPhotoId(null)} />
      ) : null}

      {objectRemovalPhoto ? (
        <ObjectRemovalDialog
          photo={objectRemovalPhoto}
          onClose={() => setObjectRemovalPhotoId(null)}
          onQueued={() => markInFlight(objectRemovalPhoto.id, "object_removal")}
        />
      ) : null}
    </section>
  );
}

function EnhanceDialog({
  chosen,
  onToggle,
  onClose,
  onSubmit,
}: {
  chosen: Set<PhotoEnhancement>;
  onToggle: (value: PhotoEnhancement) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-md border border-slate-300 bg-white p-4 shadow-sm">
      <header className="mb-1 flex items-center justify-between">
        <h3 className="font-semibold">Add creative enhancements</h3>
        <button type="button" onClick={onClose} className="text-sm text-slate-500">
          Cancel
        </button>
      </header>
      <p className="mb-3 text-xs text-slate-500">
        Safe cleanup (exposure, colour, GDPR blur, upscale) is applied automatically on upload.
        These are deliberate creative choices.
      </p>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {CREATIVE_DIALOG_ENHANCEMENTS.map((value) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
          >
            <input type="checkbox" checked={chosen.has(value)} onChange={() => onToggle(value)} />
            <span>{ENHANCEMENT_LABELS[value]}</span>
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Object removal is per-photo. Use “Remove objects” on a photo to paint what to erase.
      </p>
      <div className="mt-3 flex justify-end">
        <Button onClick={onSubmit}>Apply</Button>
      </div>
    </div>
  );
}

function EnhancePhotoCard({
  photo,
  isSelected,
  isProcessing,
  onToggleSelect,
  onAddCreative,
  onRemoveObjects,
  onRevert,
  onDelete,
}: {
  photo: Photo;
  isSelected: boolean;
  isProcessing: boolean;
  onToggleSelect: () => void;
  onAddCreative: () => void;
  onRemoveObjects: () => void;
  onRevert: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });
  const [showCompare, setShowCompare] = useState(false);
  const [showApplied, setShowApplied] = useState(false);
  const displayUrl = photo.enhanced_url ?? photo.original_url;
  const hasEnhanced = Boolean(photo.enhanced_url);
  const applied = photo.enhancements_applied as PhotoEnhancement[];

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      className="group relative overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"
    >
      <label className="absolute left-2 top-2 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded bg-white/90 shadow">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          aria-label="Select photo"
        />
      </label>
      {isProcessing ? (
        <span className="absolute right-2 top-2 z-10 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
          Auto-enhancing…
        </span>
      ) : null}

      {showCompare && photo.enhanced_url ? (
        <BeforeAfterSlider before={photo.original_url} after={photo.enhanced_url} />
      ) : (
        <img
          src={displayUrl}
          alt=""
          className="aspect-[4/3] w-full cursor-grab object-cover"
          {...attributes}
          {...listeners}
        />
      )}

      <div className="space-y-1.5 px-3 py-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-500">{photo.room_type.replace("_", " ")}</span>
          <div className="flex flex-wrap gap-2">
            {hasEnhanced ? (
              <button
                type="button"
                onClick={() => setShowCompare((v) => !v)}
                className="text-slate-600 underline"
              >
                {showCompare ? "Hide compare" : "Compare"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onAddCreative}
              className="text-[color:var(--brand-primary)] underline"
            >
              Creative
            </button>
            <button
              type="button"
              onClick={onRemoveObjects}
              className="text-[color:var(--brand-primary)] underline"
            >
              Remove objects
            </button>
            {hasEnhanced ? (
              <button type="button" onClick={onRevert} className="text-slate-600 underline">
                Revert
              </button>
            ) : null}
            <button type="button" onClick={onDelete} className="text-red-600 underline">
              Delete
            </button>
          </div>
        </div>
        {applied.length > 0 ? (
          <div>
            <button
              type="button"
              onClick={() => setShowApplied((v) => !v)}
              className="flex items-center gap-1 font-medium text-emerald-700"
            >
              <span>Auto-enhanced ({applied.length})</span>
              <span aria-hidden>{showApplied ? "▾" : "▸"}</span>
            </button>
            {showApplied ? (
              <ul className="mt-1 space-y-0.5 text-slate-500">
                {applied.map((e) => (
                  <li key={e}>· {ENHANCEMENT_LABELS[e]}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StagePhotoCard({ photo, onStage }: { photo: Photo; onStage: () => void }) {
  const [showCompare, setShowCompare] = useState(false);
  const displayUrl = photo.staged_url ?? photo.original_url;
  const hasStaged = Boolean(photo.staged_url);

  return (
    <div className="group relative overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      {hasStaged ? (
        <span className="absolute bottom-2 left-2 z-10 rounded bg-[color:var(--brand-primary)] px-2 py-0.5 text-xs text-white">
          Staged
        </span>
      ) : null}

      {showCompare && photo.staged_url ? (
        <BeforeAfterSlider before={photo.original_url} after={photo.staged_url} />
      ) : (
        <img src={displayUrl} alt="" className="aspect-[4/3] w-full object-cover" />
      )}

      <div className="flex items-center justify-between px-3 py-2 text-xs">
        <span>{photo.room_type.replace("_", " ")}</span>
        <div className="flex flex-wrap gap-2">
          {hasStaged ? (
            <button
              type="button"
              onClick={() => setShowCompare((v) => !v)}
              className="text-slate-600 underline"
            >
              {showCompare ? "Hide compare" : "Compare"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onStage}
            className="text-[color:var(--brand-primary)] underline"
          >
            {hasStaged ? "Re-stage" : "Stage"}
          </button>
        </div>
      </div>
    </div>
  );
}

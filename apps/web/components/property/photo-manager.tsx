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
import { PHOTO_ENHANCEMENTS, type Photo, type PhotoEnhancement } from "@app/shared/schemas";
import { Button } from "@app/ui";
import { photoApi, queryKeys } from "@/lib/queries";
import { BeforeAfterSlider } from "./before-after-slider";
import { StageDialog } from "./stage-dialog";
import { ObjectRemovalDialog } from "./object-removal-dialog";

// Enhancements offered in the batch dialog. Object removal is per-photo (it
// needs a painted mask), so it lives in its own dialog. Sky replacement is
// hidden until a sky provider is wired (it had no good fit after ClipDrop).
const BATCH_ENHANCEMENTS = PHOTO_ENHANCEMENTS.filter(
  (e) => e !== "object_removal" && e !== "sky_replacement",
);

const ENHANCEMENT_LABELS: Record<PhotoEnhancement, string> = {
  sky_replacement: "Sky replacement",
  object_removal: "Object removal",
  gdpr_blur: "GDPR blur (faces & plates)",
  exposure_correction: "Exposure correction",
  dusk_shot: "Dusk shot (extra image)",
};

export function PhotoManager({ propertyId }: { propertyId: string }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [chosen, setChosen] = useState<Set<PhotoEnhancement>>(new Set(["exposure_correction"]));
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [inFlight, setInFlight] = useState<Map<string, Set<PhotoEnhancement>>>(new Map());
  const [stageDialogPhotoId, setStageDialogPhotoId] = useState<string | null>(null);
  const [objectRemovalPhotoId, setObjectRemovalPhotoId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.photos(propertyId),
    queryFn: () => photoApi.list(propertyId),
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
      queryClient.setQueryData(queryKeys.photos(propertyId), res);
    },
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof photoApi.update>[1] }) =>
      photoApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.photos(propertyId) }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => photoApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.photos(propertyId) }),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(photos, oldIndex, newIndex);
    queryClient.setQueryData(queryKeys.photos(propertyId), { items: next });
    reorder.mutate(next.map((p) => p.id));
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploadingCount(files.length);
    try {
      for (const file of Array.from(files)) {
        const { upload_url } = await photoApi.createUpload(propertyId, {
          filename: file.name,
          content_type: file.type || "image/jpeg",
        });
        const putRes = await fetch(upload_url, {
          method: "PUT",
          body: file,
          headers: { "content-type": file.type || "image/jpeg" },
        });
        if (!putRes.ok) {
          throw new Error(`Upload failed for ${file.name} (${putRes.status})`);
        }
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.photos(propertyId) });
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
    const enhancements = Array.from(chosen);
    try {
      await Promise.all(ids.map((id) => photoApi.enhance(id, { enhancements })));
      setInFlight((prev) => {
        const next = new Map(prev);
        for (const id of ids) {
          const existing = next.get(id) ?? new Set<PhotoEnhancement>();
          for (const e of enhancements) existing.add(e);
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
        <h2 className="text-lg font-semibold">Photos</h2>
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

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-300 bg-slate-50 px-3 py-2">
          <span className="text-sm">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button onClick={() => setDialogOpen(true)}>Enhance selected</Button>
            <Button variant="outline" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      {dialogOpen ? (
        <EnhanceDialog
          chosen={chosen}
          onToggle={toggleChosen}
          onClose={() => setDialogOpen(false)}
          onSubmit={() => runEnhance(Array.from(selected))}
        />
      ) : null}

      {enhanceError ? (
        <p role="alert" className="text-sm text-red-600">
          {enhanceError}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading photos…</p>
      ) : photos.length === 0 ? (
        <p className="text-sm text-slate-500">No photos yet — upload to get started.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {photos.map((photo) => (
                <SortablePhoto
                  key={photo.id}
                  photo={photo}
                  isSelected={selected.has(photo.id)}
                  isProcessing={inFlight.has(photo.id)}
                  onToggleSelect={() => toggleSelected(photo.id)}
                  onEnhanceJustThis={() => {
                    setDialogOpen(true);
                    setSelected(new Set([photo.id]));
                  }}
                  onStage={() => setStageDialogPhotoId(photo.id)}
                  onRemoveObjects={() => setObjectRemovalPhotoId(photo.id)}
                  onSetPrimary={() =>
                    update.mutate({ id: photo.id, payload: { is_primary: true } })
                  }
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
      <header className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Enhance photos</h3>
        <button type="button" onClick={onClose} className="text-sm text-slate-500">
          Cancel
        </button>
      </header>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {BATCH_ENHANCEMENTS.map((value) => (
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
        Object removal is per-photo — use “Remove objects” on a photo to paint what to erase.
      </p>
      <div className="mt-3 flex justify-end">
        <Button onClick={onSubmit}>Run enhancements</Button>
      </div>
    </div>
  );
}

function SortablePhoto({
  photo,
  isSelected,
  isProcessing,
  onToggleSelect,
  onEnhanceJustThis,
  onStage,
  onRemoveObjects,
  onSetPrimary,
  onDelete,
}: {
  photo: Photo;
  isSelected: boolean;
  isProcessing: boolean;
  onToggleSelect: () => void;
  onEnhanceJustThis: () => void;
  onStage: () => void;
  onRemoveObjects: () => void;
  onSetPrimary: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });
  const [showCompare, setShowCompare] = useState(false);
  const hasEnhanced = Boolean(photo.enhanced_url);

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
          Processing…
        </span>
      ) : null}

      {showCompare && photo.enhanced_url ? (
        <BeforeAfterSlider before={photo.original_url} after={photo.enhanced_url} />
      ) : (
        <img
          src={photo.enhanced_url ?? photo.original_url}
          alt=""
          className="aspect-[4/3] w-full cursor-grab object-cover"
          {...attributes}
          {...listeners}
        />
      )}

      <div className="flex items-center justify-between px-3 py-2 text-xs">
        <span>{photo.is_primary ? "Primary" : photo.room_type.replace("_", " ")}</span>
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
            onClick={onEnhanceJustThis}
            className="text-[color:var(--brand-primary)] underline"
          >
            Enhance
          </button>
          <button
            type="button"
            onClick={onStage}
            className="text-[color:var(--brand-primary)] underline"
          >
            Stage
          </button>
          <button
            type="button"
            onClick={onRemoveObjects}
            className="text-[color:var(--brand-primary)] underline"
          >
            Remove objects
          </button>
          {!photo.is_primary ? (
            <button
              type="button"
              onClick={onSetPrimary}
              className="text-[color:var(--brand-primary)] underline"
            >
              Set primary
            </button>
          ) : null}
          <button type="button" onClick={onDelete} className="text-red-600 underline">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

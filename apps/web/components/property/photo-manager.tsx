"use client";

import { useRef, useState } from "react";
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
import type { Photo } from "@app/shared/schemas";
import { Button } from "@app/ui";
import { photoApi, queryKeys } from "@/lib/queries";

export function PhotoManager({ propertyId }: { propertyId: string }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.photos(propertyId),
    queryFn: () => photoApi.list(propertyId),
  });

  const photos = data?.items ?? [];

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
    </section>
  );
}

function SortablePhoto({
  photo,
  onSetPrimary,
  onDelete,
}: {
  photo: Photo;
  onSetPrimary: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });
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
      <img
        src={photo.original_url}
        alt=""
        className="aspect-[4/3] w-full cursor-grab object-cover"
        {...attributes}
        {...listeners}
      />
      <div className="flex items-center justify-between px-3 py-2 text-xs">
        <span>{photo.is_primary ? "Primary" : photo.room_type.replace("_", " ")}</span>
        <div className="flex gap-2">
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

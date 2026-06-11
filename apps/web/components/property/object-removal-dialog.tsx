"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Photo } from "@app/shared/schemas";
import { Button } from "@app/ui";
import { photoApi } from "@/lib/queries";

/**
 * Object-removal dialog. The user paints over the things to remove; the strokes
 * become a black/white mask (white = remove) that's uploaded to R2 and sent to
 * the enhance endpoint with `object_removal`, which the orchestrator hands to
 * Replicate LaMa inpainting.
 *
 * The photo is shown as a plain <img>; only the brush strokes are drawn into
 * the canvas, so exporting the mask never taints the canvas with cross-origin
 * image data. The canvas buffer matches the photo's natural pixel size so the
 * mask lines up with what the orchestrator processes.
 */
export function ObjectRemovalDialog({
  photo,
  onClose,
  onQueued,
}: {
  photo: Photo;
  onClose: () => void;
  onQueued: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [brush, setBrush] = useState(28);
  const [hasPainted, setHasPainted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    setBrush(Math.max(12, Math.round(img.naturalWidth * 0.04)));
  }

  function toCanvasXY(e: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function paintTo(point: { x: number; y: number }) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#ffffff";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brush;
    if (last.current) {
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(point.x, point.y, brush / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    last.current = point;
  }

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    last.current = null;
    canvasRef.current?.setPointerCapture(e.pointerId);
    paintTo(toCanvasXY(e));
    setHasPainted(true);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    paintTo(toCanvasXY(e));
  }

  function onPointerUp() {
    drawing.current = false;
    last.current = null;
  }

  function clearMask() {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasPainted(false);
  }

  function exportMask(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const paint = canvasRef.current;
      if (!paint) return reject(new Error("Canvas not ready."));
      // Composite the white strokes over a black background — the inpaint
      // model expects a black/white mask where white marks what to remove.
      const out = document.createElement("canvas");
      out.width = paint.width;
      out.height = paint.height;
      const ctx = out.getContext("2d")!;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(paint, 0, 0);
      out.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not export mask."))),
        "image/png",
      );
    });
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const blob = await exportMask();
      const { upload_url, mask_url } = await photoApi.maskUpload(photo.id, {
        content_type: "image/png",
      });
      const put = await fetch(upload_url, {
        method: "PUT",
        body: blob,
        headers: { "content-type": "image/png" },
      });
      if (!put.ok) throw new Error(`Mask upload failed (${put.status}).`);
      await photoApi.enhance(photo.id, { enhancements: ["object_removal"], mask_url });
      onQueued();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove objects.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 py-12">
      <div className="w-full max-w-2xl space-y-4 rounded-lg bg-white p-6 shadow-xl">
        <header className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Remove objects</h2>
            <p className="text-sm text-slate-500">
              Paint over the things you want gone, like a bin, a car, or clutter, then remove them.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-slate-500">
            Close
          </button>
        </header>

        <div className="relative overflow-hidden rounded-md border border-slate-200">
          <img
            src={photo.original_url}
            alt=""
            onLoad={onImageLoad}
            className="block w-full select-none"
            draggable={false}
          />
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            className="absolute inset-0 h-full w-full cursor-crosshair opacity-50"
            style={{ touchAction: "none" }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium">Brush</span>
            <input
              type="range"
              min={8}
              max={120}
              value={brush}
              onChange={(e) => setBrush(Number(e.target.value))}
            />
          </label>
          <Button variant="outline" onClick={clearMask} disabled={!hasPainted || submitting}>
            Clear
          </Button>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!hasPainted || submitting}>
            {submitting ? "Removing…" : "Remove objects"}
          </Button>
        </div>
      </div>
    </div>
  );
}

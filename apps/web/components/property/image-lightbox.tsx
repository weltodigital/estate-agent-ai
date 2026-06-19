"use client";

import { useEffect } from "react";
import { BeforeAfterSlider } from "./before-after-slider";

/**
 * Full-screen overlay that shows an image at its natural size. Sits above the
 * staging dialog (z-60), and closes on backdrop click, the Close button, or
 * Escape. Hand-rolled to match the existing overlay pattern in StageDialog —
 * there's no shared modal primitive in the app.
 *
 * Pass `before` to show a before/after compare slider (e.g. original vs the
 * enhanced/staged result) instead of a single image.
 */
export function ImageLightbox({
  src,
  before,
  alt = "",
  onClose,
}: {
  src: string;
  before?: string;
  alt?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Enlarged image"
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close enlarged image"
        className="text-brand-cream/80 hover:text-brand-cream absolute right-4 top-4 text-sm"
      >
        Close
      </button>
      {/* Stop propagation so interacting with the image doesn't close the overlay. */}
      {before ? (
        <div onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl">
          <BeforeAfterSlider before={before} after={src} className="rounded-lg shadow-2xl" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
        />
      )}
    </div>
  );
}

"use client";

import { useEffect } from "react";

/**
 * Full-screen overlay that shows a single image at its natural size. Sits above
 * the staging dialog (z-60), and closes on backdrop click, the Close button, or
 * Escape. Hand-rolled to match the existing overlay pattern in StageDialog —
 * there's no shared modal primitive in the app.
 */
export function ImageLightbox({
  src,
  alt = "",
  onClose,
}: {
  src: string;
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
        className="absolute right-4 top-4 text-sm text-white/80 hover:text-white"
      >
        Close
      </button>
      {/* Stop propagation so clicking the image itself doesn't close the overlay. */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
      />
    </div>
  );
}

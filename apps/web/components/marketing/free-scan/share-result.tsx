"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Share this free-scan result: the native share sheet where there is one, else copy the link. */
export function ShareResult({ title, className }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Share sheet dismissed, or clipboard blocked: nothing to do.
    }
  }
  return (
    <button
      type="button"
      onClick={share}
      className={cn("ring-brand-focus inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium active:scale-[0.97]", className)}
    >
      <Share2 size={16} strokeWidth={1.5} aria-hidden="true" />
      <span aria-live="polite">{copied ? "Link copied" : "Share this result"}</span>
    </button>
  );
}

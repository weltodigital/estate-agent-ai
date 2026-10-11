"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** Copies the question, engine and answer as plain text, signed "Measured by Privett". */
export function CopyAnswer({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
      className="ring-brand-focus inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-small font-medium text-ink-muted hover:bg-brand-tint hover:text-ink"
    >
      {copied ? <Check size={14} strokeWidth={1.5} /> : <Copy size={14} strokeWidth={1.5} />}
      <span aria-live="polite">{copied ? "Copied" : "Copy answer"}</span>
    </button>
  );
}

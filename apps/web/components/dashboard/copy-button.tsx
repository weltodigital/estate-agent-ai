"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      className="ring-brand-focus inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface-raised px-2.5 py-1 text-small font-medium text-ink hover:bg-brand-tint"
    >
      {copied ? <Check size={14} strokeWidth={1.5} /> : <Copy size={14} strokeWidth={1.5} className="text-ink-muted" />}
      {copied ? "Copied" : label}
    </button>
  );
}

export function CodeBlock({ text, label }: { text: string; label?: string }) {
  return (
    <div className="overflow-hidden rounded-md border border-hairline">
      <div className="flex items-center justify-between gap-2 border-b border-hairline bg-surface-sunken px-3 py-1.5">
        <span className="text-small text-ink-muted">{label}</span>
        <CopyButton text={text} />
      </div>
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words bg-surface-sunken p-3 font-mono text-data leading-relaxed text-ink">
        {text}
      </pre>
    </div>
  );
}

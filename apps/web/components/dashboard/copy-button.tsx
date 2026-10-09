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
      className="ring-brand-focus inline-flex items-center gap-1.5 rounded-md border border-brand-stone bg-white px-2.5 py-1 text-xs font-medium text-brand-ink hover:bg-brand-cream"
    >
      {copied ? <Check size={14} strokeWidth={1.5} /> : <Copy size={14} strokeWidth={1.5} className="text-brand-slate" />}
      {copied ? "Copied" : label}
    </button>
  );
}

export function CodeBlock({ text, label }: { text: string; label?: string }) {
  return (
    <div className="overflow-hidden rounded-md border border-brand-stone">
      <div className="flex items-center justify-between gap-2 border-b border-brand-stone bg-brand-cream px-3 py-1.5">
        <span className="text-xs text-brand-walnut">{label}</span>
        <CopyButton text={text} />
      </div>
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words bg-white p-3 font-mono text-xs leading-relaxed text-brand-ink">
        {text}
      </pre>
    </div>
  );
}

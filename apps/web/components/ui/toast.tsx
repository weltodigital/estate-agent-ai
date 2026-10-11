"use client";

import { AlertTriangle, Check } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Toasts with Undo for optimistic updates (docs/ux-spec.md section 5).
// Bottom-centre, auto-dismiss after 5s, announced politely.

type Tone = "neutral" | "warn";
interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
  undo?: () => void;
}
interface ToastOptions {
  tone?: Tone;
  undo?: () => void;
}

const ToastContext = createContext<{ toast: (message: string, opts?: ToastOptions) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx.toast;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((all) => all.filter((t) => t.id !== id)), []);
  const toast = useCallback((message: string, opts: ToastOptions = {}) => {
    const id = nextId.current++;
    // One at a time keeps it calm; the newest replaces the last.
    setItems([{ id, message, tone: opts.tone ?? "neutral", undo: opts.undo }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
        {items.map((t) => (
          <Toast key={t.id} item={t} onDone={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 5000);
    return () => clearTimeout(timer);
  }, [onDone]);
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex max-w-md animate-fade-in-up items-center gap-3 rounded-md border bg-surface-raised px-4 py-2.5 text-sm shadow-pop",
        item.tone === "warn" ? "border-warn/40 text-ink" : "border-hairline text-ink",
      )}
    >
      {item.tone === "warn" ? (
        <AlertTriangle size={16} strokeWidth={1.5} className="shrink-0 text-warn" aria-hidden="true" />
      ) : (
        <Check size={16} strokeWidth={1.5} className="shrink-0 text-ink-muted" aria-hidden="true" />
      )}
      <span>{item.message}</span>
      {item.undo ? (
        <button
          type="button"
          onClick={() => {
            item.undo?.();
            onDone();
          }}
          className="ring-brand-focus ml-1 rounded-sm px-1.5 py-0.5 font-semibold text-brand hover-fine:bg-brand-tint"
        >
          Undo
        </button>
      ) : null}
    </div>
  );
}

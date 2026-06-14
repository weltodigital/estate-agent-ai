"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, Check, Loader2, X } from "lucide-react";

type ToastStatus = "loading" | "success" | "error";
type Toast = {
  id: number;
  status: ToastStatus;
  title: string;
  subtitle?: string;
  onRetry?: () => void;
};

export type ToastApi = {
  /** Show a spinner toast; returns its id to update later. */
  loading: (title: string, subtitle?: string) => number;
  /** Update a toast (or create one) to success; auto-dismisses after 3s. */
  success: (id: number | undefined, title: string, subtitle?: string) => number;
  /** Update a toast (or create one) to error; persists until dismissed. */
  error: (
    id: number | undefined,
    title: string,
    opts?: { subtitle?: string; onRetry?: () => void },
  ) => number;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const upsert = useCallback((toast: Toast) => {
    setToasts((prev) =>
      prev.some((t) => t.id === toast.id)
        ? prev.map((t) => (t.id === toast.id ? toast : t))
        : [...prev, toast],
    );
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      loading: (title, subtitle) => {
        const id = nextId.current++;
        upsert({ id, status: "loading", title, subtitle });
        return id;
      },
      success: (id, title, subtitle) => {
        const tid = id ?? nextId.current++;
        upsert({ id: tid, status: "success", title, subtitle });
        setTimeout(() => dismiss(tid), 3000);
        return tid;
      },
      error: (id, title, opts) => {
        const tid = id ?? nextId.current++;
        upsert({
          id: tid,
          status: "error",
          title,
          subtitle: opts?.subtitle,
          onRetry: opts?.onRetry,
        });
        return tid;
      },
      dismiss,
    }),
    [upsert, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="border-brand-stone bg-brand-cream shadow-card pointer-events-auto flex items-start gap-2.5 rounded-xl border-[0.5px] p-3"
          >
            <span className="mt-0.5 shrink-0">
              {t.status === "loading" ? (
                <Loader2 className="text-brand-walnut h-4 w-4 animate-spin" strokeWidth={2} />
              ) : t.status === "success" ? (
                <Check className="text-brand-hedge h-4 w-4" strokeWidth={2} />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" strokeWidth={2} />
              )}
            </span>
            <div className="flex-1">
              <p className="text-brand-ink text-sm font-medium">{t.title}</p>
              {t.subtitle ? <p className="text-brand-walnut text-[13px]">{t.subtitle}</p> : null}
              {t.status === "error" && t.onRetry ? (
                <button
                  type="button"
                  onClick={() => {
                    const retry = t.onRetry;
                    dismiss(t.id);
                    retry?.();
                  }}
                  className="text-brand-terracotta mt-1 text-[13px] font-medium"
                >
                  Try again
                </button>
              ) : null}
            </div>
            {t.status !== "loading" ? (
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="text-brand-slate hover:text-brand-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

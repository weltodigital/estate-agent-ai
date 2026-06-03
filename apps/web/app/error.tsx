"use client";

import { useEffect } from "react";
import { ERROR_COPY } from "@/lib/copy";

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // TODO: ship to Sentry once wired (phase-1/10).
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md space-y-4 px-6 py-16 text-center">
      <h1 className="text-brand-ink text-xl">{ERROR_COPY.generic}</h1>
      <p className="text-brand-slate text-sm">
        We&rsquo;ve logged it. If it keeps happening, let us know.
      </p>
      <button
        onClick={reset}
        className="bg-brand-hedge text-brand-bone rounded-md px-3 py-2 text-sm font-medium"
      >
        Try again
      </button>
    </div>
  );
}

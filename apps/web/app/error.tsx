"use client";

import { useEffect } from "react";

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // TODO: ship to Sentry once wired (phase-1/10).
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md space-y-4 px-6 py-16 text-center">
      <h1 className="text-xl font-semibold">Something went wrong.</h1>
      <p className="text-sm text-slate-500">{error.message}</p>
      <button
        onClick={reset}
        className="rounded-md bg-[color:var(--brand-primary)] px-3 py-2 text-sm text-white"
      >
        Try again
      </button>
    </div>
  );
}

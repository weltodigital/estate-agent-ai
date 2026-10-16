"use client";

import { useEffect } from "react";
import "./globals.css";

// Last resort: the root layout itself failed, so this renders its own
// <html>. Kept dependency-free so it can't fail the same way.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="en-GB">
      <body className="bg-surface text-ink">
        <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-16">
          <h1 className="text-title">Privett is having trouble right now</h1>
          <p className="mt-2 text-ink-muted">Your data is safe. Please try again in a moment.</p>
          {error.digest ? <p className="mt-2 font-mono text-data text-ink-muted">Reference {error.digest}</p> : null}
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => reset()}
              className="inline-flex h-10 items-center rounded-md bg-brand px-4 text-[14px] font-semibold text-on-brand"
            >
              Try again
            </button>
            {/* A plain link on purpose: a full reload, not client navigation. */}
            <a href="/" className="inline-flex h-10 items-center rounded-md border border-hairline px-4 text-[14px] font-semibold">
              Privett home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/empty-state";

/** Shared body for error.tsx boundaries: calm, honest, one action. */
export function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-2xl py-10">
      <ErrorState
        title="Something went wrong loading this page. Your data is safe."
        action={
          <Button variant="secondary" onClick={() => reset()}>
            Retry
          </Button>
        }
      >
        {error.digest ? <span className="font-mono text-data">Reference {error.digest}</span> : "Please try again in a moment."}
      </ErrorState>
    </div>
  );
}

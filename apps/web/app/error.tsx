"use client";

import { useEffect } from "react";
import Link from "next/link";
import { StandalonePage } from "@/components/platform/standalone-page";
import { Button, buttonClasses } from "@/components/ui/button";

// Errors outside the signed-in app (marketing pages, free scan, sign-in).
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <StandalonePage
      title="Something went wrong loading this page"
      actions={
        <>
          <Button onClick={() => reset()}>Try again</Button>
          <Link href="/" className={buttonClasses("secondary")}>
            Privett home
          </Link>
        </>
      }
    >
      <p>Please try again in a moment.</p>
      {error.digest ? <p className="mt-2 font-mono text-data">Reference {error.digest}</p> : null}
    </StandalonePage>
  );
}

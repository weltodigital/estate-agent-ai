"use client";

import { Check, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RelativeTime } from "@/components/ui/time";
import { checkInstallation } from "./actions";

/** Turns green once the first AI referral arrives (docs/ux-spec.md section 6). */
export function CheckInstallation({ branchId, initialLast }: { branchId: string; initialLast: string | null }) {
  const [last, setLast] = useState(initialLast);
  const [checked, setChecked] = useState(false);
  const [pending, startTransition] = useTransition();

  if (last) {
    return (
      <p className="inline-flex items-center gap-2 rounded-md bg-up/10 px-3 py-2 text-sm font-medium text-up">
        <Check size={16} strokeWidth={2} className="animate-tick-pop" aria-hidden="true" />
        Installed. Last visit received <RelativeTime iso={last} />.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await checkInstallation(branchId);
            setLast(res.last);
            setChecked(true);
          })
        }
      >
        {pending ? <Loader2 size={16} strokeWidth={1.5} className="animate-spin" aria-hidden="true" /> : null}
        Check installation
      </Button>
      {checked && !pending ? (
        <span role="status" className="text-small text-ink-muted">
          Nothing received yet. Visit your site from a link in ChatGPT, then check again.
        </span>
      ) : null}
    </div>
  );
}

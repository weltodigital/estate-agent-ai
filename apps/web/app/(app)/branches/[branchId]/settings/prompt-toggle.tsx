"use client";

import { useOptimistic, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { setPromptActive } from "./actions";

/** Turn a tracked question on or off instantly, with Undo (docs/ux-spec.md section 5). */
export function PromptToggle({ branchId, promptId, active, text }: { branchId: string; promptId: string; active: boolean; text: string }) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [on, setOn] = useOptimistic(active);
  const short = text.length > 48 ? `${text.slice(0, 47)}…` : text;

  function apply(next: boolean, undoable = true) {
    startTransition(async () => {
      setOn(next);
      const res = await setPromptActive(branchId, promptId, next);
      if ("error" in res) {
        toast(res.error, { tone: "warn" });
        return;
      }
      if (undoable) toast(next ? `Tracking “${short}”` : `Stopped tracking “${short}”`, { undo: () => apply(!next, false) });
    });
  }

  return (
    <Button type="button" variant={on ? "secondary" : "primary"} size="sm" className="h-10" aria-pressed={on} onClick={() => apply(!on)}>
      {on ? "Turn off" : "Turn on"}
    </Button>
  );
}

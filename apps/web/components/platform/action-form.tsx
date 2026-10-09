"use client";

import { useActionState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ActionResult = { error?: string; ok?: string } | null;
export type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

/** Form bound to a server action that returns { error } or { ok }. */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} aria-busy={pending}>
      {/* Layout classes go on the fieldset: with display:contents (as before)
          space-y-* on the form never reached the fields. */}
      <fieldset disabled={pending} className={cn("m-0 min-w-0 border-0 p-0", className)}>
        {children}
      </fieldset>
      {state?.error ? (
        <p role="alert" className="mt-2 text-sm text-down">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? <p className="mt-2 text-sm text-up">{state.ok}</p> : null}
    </form>
  );
}

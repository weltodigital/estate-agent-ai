import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";

// Empty and error states (docs/ux-spec.md section 6): a value-led headline,
// a line or two of explanation, one action. Empty states have no icon;
// errors use the warn icon, so the two never look alike.

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="animate-fade-in-up rounded-lg border border-dashed border-hairline bg-surface-sunken px-6 py-10 text-center">
      <p className="text-heading text-ink">{title}</p>
      {children ? <div className="mx-auto mt-1 max-w-md text-sm text-ink-muted">{children}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** A filter that matches nothing: say which, and offer to clear it. */
export function NoMatches({ what, clearHref }: { what: string; clearHref: string }) {
  return (
    <EmptyState
      title={`No answers match “${what}”`}
      action={
        <Link href={clearHref} className={buttonClasses("secondary", "sm")}>
          Clear filters
        </Link>
      }
    >
      Try a different assistant or question type.
    </EmptyState>
  );
}

/** An error, distinct from "no results". */
export function ErrorState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div role="alert" className="rounded-lg border border-warn/30 bg-warn/5 px-6 py-8 text-center">
      <AlertTriangle size={20} strokeWidth={1.5} className="mx-auto text-warn" aria-hidden="true" />
      <p className="mt-2 text-heading text-ink">{title}</p>
      {children ? <div className="mx-auto mt-1 max-w-md text-sm text-ink-muted">{children}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** This week's scan didn't finish. */
export function ScanFailed({ action }: { action?: ReactNode }) {
  return (
    <ErrorState title="This week’s scan didn’t finish. Your data is safe." action={action}>
      Earlier results are unchanged. You can run the scan again now.
    </ErrorState>
  );
}

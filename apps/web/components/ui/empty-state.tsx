import type { ReactNode } from "react";

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-hairline bg-surface-sunken px-6 py-10 text-center">
      <p className="font-medium text-ink">{title}</p>
      {children ? <div className="mx-auto mt-1 max-w-md text-sm text-ink-muted">{children}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

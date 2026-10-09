import type { ReactNode } from "react";

export function PageHeader({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-title text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-ink-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

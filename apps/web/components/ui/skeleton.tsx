import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Placeholder shaped like the content it replaces, so nothing shifts when
 * data arrives (docs/ux-spec.md section 5). Opacity pulse only; static under
 * reduced motion.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn("animate-skeleton rounded-sm bg-rival-soft/60", className)} {...props} />;
}

/** A card-shaped block with a few skeleton lines. */
export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-hairline bg-surface-raised p-6", className)}>
      <Skeleton className="h-4 w-1/3" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className={cn("h-3", i % 3 === 2 ? "w-2/3" : "w-full")} />
        ))}
      </div>
    </div>
  );
}

/** Screen-reader announcement for a loading region. */
export function LoadingLabel({ children = "Loading" }: { children?: string }) {
  return (
    <span className="sr-only" role="status">
      {children}
    </span>
  );
}

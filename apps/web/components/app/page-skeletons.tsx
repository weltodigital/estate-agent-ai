import { LoadingLabel, Skeleton, SkeletonCard } from "@/components/ui/skeleton";

// Skeletons shaped like each page so nothing shifts when data arrives
// (docs/ux-spec.md section 5). Used by loading.tsx files.

export function OverviewSkeleton() {
  return (
    <div className="space-y-8">
      <LoadingLabel>Loading your overview</LoadingLabel>
      <div className="space-y-3">
        <Skeleton className="h-7 w-full max-w-3xl" />
        <Skeleton className="h-7 w-2/3 max-w-2xl" />
        <Skeleton className="h-3.5 w-80" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-hairline bg-surface-raised p-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-9 w-24" />
            <Skeleton className="mt-3 h-3 w-28" />
            <Skeleton className="mt-4 h-6 w-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-hairline bg-surface-raised p-6">
          <Skeleton className="h-4 w-48" />
          <div className="mt-5 space-y-3">
            {[90, 75, 60, 52, 40, 30].map((w) => (
              <div key={w} className="grid grid-cols-[9rem_1fr_3rem] items-center gap-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2.5" style={{ width: `${w}%` }} />
                <Skeleton className="h-3 w-8 justify-self-end" />
              </div>
            ))}
          </div>
        </div>
        <SkeletonCard lines={6} />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 8, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div className="space-y-6">
      <LoadingLabel>{label}</LoadingLabel>
      <Skeleton className="h-8 w-56 rounded-md" />
      <div className="overflow-hidden rounded-lg border border-hairline bg-surface-raised">
        <div className="border-b border-hairline px-6 py-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-2 h-3 w-80" />
        </div>
        <div className="bg-surface-sunken px-5 py-2.5">
          <Skeleton className="h-3 w-full" />
        </div>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-hairline px-5 py-3">
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ items = 5, label = "Loading" }: { items?: number; label?: string }) {
  return (
    <div className="space-y-4">
      <LoadingLabel>{label}</LoadingLabel>
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
      {Array.from({ length: items }, (_, i) => (
        <div key={i} className="rounded-lg border border-hairline bg-surface-raised px-5 py-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ cards = 2, label = "Loading" }: { cards?: number; label?: string }) {
  return (
    <div className="space-y-6">
      <LoadingLabel>{label}</LoadingLabel>
      {Array.from({ length: cards }, (_, i) => (
        <SkeletonCard key={i} lines={5} />
      ))}
    </div>
  );
}

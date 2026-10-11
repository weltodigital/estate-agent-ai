import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const field =
  "ring-brand-focus h-12 w-full rounded-md border border-hairline bg-surface-raised px-4 text-body text-ink placeholder:text-ink-muted";

/**
 * Step 1 of the free scan: just website and town. A plain GET to /free-scan,
 * which asks for the agency name (prefilled) and email on step 2.
 */
export function ScanForm({ id, className }: { id?: string; className?: string }) {
  return (
    <form id={id} action="/free-scan" method="get" className={cn("flex flex-col gap-3 sm:flex-row", className)}>
      <label className="flex-1">
        <span className="sr-only">Your website</span>
        <input name="website" required inputMode="url" autoComplete="url" placeholder="Your website" className={field} />
      </label>
      <label className="sm:w-44">
        <span className="sr-only">Town</span>
        <input name="town" required autoComplete="address-level2" placeholder="Town" className={field} />
      </label>
      <button type="submit" className={buttonClasses("primary", "lg", "h-12 shrink-0 px-6")}>
        Run free scan
      </button>
    </form>
  );
}

export function TrustLine({ className }: { className?: string }) {
  const parts = ["Free", "About 3 minutes", "No card needed"];
  if (process.env.NEXT_PUBLIC_RESULTS_BY_EMAIL === "true") parts.push("Results by email");
  return <p className={cn("text-small text-ink-muted", className)}>{parts.join(" · ")}</p>;
}

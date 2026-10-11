import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { buttonClasses } from "@/components/ui/button";

/** Top bar for the public example report: says plainly it's made-up data. */
export function DemoBanner() {
  return (
    <div className="border-b border-hairline bg-surface-raised">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 md:px-10">
        <Link href="/" aria-label="Back to Privett">
          <Logo size={22} />
        </Link>
        <p className="min-w-0 flex-1 text-small text-ink-muted">
          <span className="font-medium text-ink">Example report.</span> Harbour &amp; Hale and every agency here are made up, and so is the data.
        </p>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/" className={buttonClasses("ghost", "sm")}>
            Back to Privett
          </Link>
          <Link href="/free-scan" className={buttonClasses("primary", "sm")}>
            Run your own free scan
          </Link>
        </div>
      </div>
    </div>
  );
}

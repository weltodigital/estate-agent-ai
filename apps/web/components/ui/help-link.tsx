import Link from "next/link";
import { CircleHelp } from "lucide-react";

/** A quiet "What this means" link to the matching part of the How Privett works guide. */
export function HelpLink({ section, label = "What this means" }: { section: string; label?: string }) {
  return (
    <Link
      href={`/how-it-works#${section}`}
      target="_blank"
      className="ring-brand-focus inline-flex items-center gap-1 rounded text-small text-ink-muted hover:text-ink"
    >
      <CircleHelp size={14} strokeWidth={1.5} aria-hidden="true" />
      {label}
    </Link>
  );
}

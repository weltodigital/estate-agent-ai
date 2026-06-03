import type { CSSProperties } from "react";

/**
 * Privett wordmark — PLACEHOLDER.
 *
 * Renders "Privett" in Fraunces 400 with the brand opsz/tracking. A proper
 * logo is being designed separately and will replace this component; keep it
 * self-contained so that swap is a one-file change. See BRANDING.md.
 */
export function Wordmark({
  size = 24,
  variant = "hedge",
  className,
}: {
  /** Rendered font size in px. Default 24 (header). 64 on the landing hero. */
  size?: number;
  /** "hedge" on light backgrounds, "bone" on dark. */
  variant?: "hedge" | "bone";
  className?: string;
}) {
  const style: CSSProperties = {
    fontFamily: "var(--font-fraunces), Fraunces, Georgia, serif",
    fontWeight: 400,
    fontSize: size,
    lineHeight: 1,
    fontVariationSettings: "'opsz' 144",
    letterSpacing: "-0.015em",
  };

  return (
    <span
      style={style}
      className={`${variant === "bone" ? "text-brand-bone" : "text-brand-hedge"} ${className ?? ""}`}
    >
      Privett
    </span>
  );
}

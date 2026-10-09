// Privett logo: the "p" answer-bubble mark, with or without the wordmark.
// Inline SVG so it inherits theme tokens: the mark uses `brand` (Evergreen,
// or the dark-theme green), the dot is always Signal Lime. See BRANDING.md.

const MARK_PATH =
  "M14 26A20 20 0 1 1 34 46H28V56A4 4 0 0 1 24 60H18A4 4 0 0 1 14 56ZM41 26A7 7 0 1 0 27 26A7 7 0 1 0 41 26Z";

export function LogoMark({
  size = 24,
  variant = "default",
  className,
}: {
  size?: number;
  /** default: brand + lime dot. reverse: white + lime dot, for brand fills. mono: brand only (under 20px, print). */
  variant?: "default" | "reverse" | "mono";
  className?: string;
}) {
  const showDot = variant !== "mono" && size >= 20;
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
      style={{ flexShrink: 0 }}
    >
      <path
        fillRule="evenodd"
        d={MARK_PATH}
        fill={variant === "reverse" ? "#FFFFFF" : "rgb(var(--brand))"}
      />
      {showDot ? <circle cx="34" cy="26" r="4.5" fill="#C8F169" /> : null}
    </svg>
  );
}

/** Mark + lowercase "privett" wordmark. Text is 0.85x the mark height, 10px gap. */
export function Logo({
  size = 24,
  variant = "default",
  className,
}: {
  size?: number;
  variant?: "default" | "reverse";
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center ${className ?? ""}`} style={{ gap: 10 }} aria-label="Privett">
      <LogoMark size={size} variant={variant} />
      <span
        aria-hidden="true"
        style={{
          fontSize: Math.round(size * 0.85),
          lineHeight: 1,
          fontWeight: 600,
          letterSpacing: "-0.03em",
          color: variant === "reverse" ? "#FFFFFF" : "rgb(var(--ink))",
        }}
      >
        privett
      </span>
    </span>
  );
}

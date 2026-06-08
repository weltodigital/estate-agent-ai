// Privett wordmark — the real logo (apps/web/public/privett-logo*.png).
//
// One component, two assets: the Hedge Green logo for light backgrounds and a
// Bone (light) variant for dark backgrounds (the footer, etc.). Every usage
// across the site/app goes through here, so swapping the asset is one change.
// See BRANDING.md.

const LOGO_ASPECT = 902 / 366; // intrinsic logo dimensions

export function Wordmark({
  size = 24,
  variant = "hedge",
  className,
}: {
  /** Rendered logo height in px. Default 24 (header/footer/auth). */
  size?: number;
  /** "hedge" (green logo) on light backgrounds, "bone" (light logo) on dark. */
  variant?: "hedge" | "bone";
  className?: string;
}) {
  const src = variant === "bone" ? "/privett-logo-bone.png" : "/privett-logo.png";

  // Plain <img> (not next/image): a small static public asset that needs no
  // optimisation, and it keeps the component dependency-free and SSR-trivial.
  return (
    <img
      src={src}
      alt="Privett"
      height={size}
      width={Math.round(size * LOGO_ASPECT)}
      style={{ height: size, width: "auto" }}
      className={className}
    />
  );
}

import { Wordmark } from "@/components/brand/wordmark";

const NAV_LINKS = [
  { href: "/#features", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/login", label: "Sign in" },
];

/**
 * Shared marketing header. Sticky on scroll, Bone background, 0.5px Stone
 * border-bottom. See BRANDING.md for the colour and type rules.
 */
export function MarketingHeader() {
  return (
    <header
      className="bg-brand-bone/95 sticky top-0 z-50 backdrop-blur"
      style={{ borderBottom: "0.5px solid #E4DFD0" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="/" aria-label="Privett home">
          <Wordmark size={24} />
        </a>
        <nav className="flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-brand-walnut hover:text-brand-ink text-sm transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a
            href="/signup"
            className="bg-brand-hedge text-brand-bone rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Start free trial
          </a>
        </nav>
      </div>
    </header>
  );
}

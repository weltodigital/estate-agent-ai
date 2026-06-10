import { Wordmark } from "@/components/brand/wordmark";
import { CONTACT_EMAIL } from "@/lib/copy";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Changelog", href: "#" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Help", href: "/contact" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
  {
    heading: "Connect",
    links: [
      { label: "Email", href: `mailto:${CONTACT_EMAIL}` },
      { label: "X", href: "#" },
      { label: "LinkedIn", href: "#" },
    ],
  },
];

/** Shared marketing footer. Hedge Green background, Bone wordmark. */
export function MarketingFooter() {
  return (
    <footer className="bg-brand-hedge">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <Wordmark size={40} variant="bone" />
          </div>
          {COLUMNS.map((column) => (
            <div key={column.heading}>
              <p className="text-brand-bone mb-4 text-sm font-medium">{column.heading}</p>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-brand-sand hover:text-brand-bone text-sm transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="text-brand-sand mt-14 flex flex-col gap-1 text-xs">
          <p>© 2026 Privett Ltd. Made in the UK.</p>
          <p>Privett is a registered trading name.</p>
        </div>
      </div>
    </footer>
  );
}

// Structured data and site facts for search engines and AI assistants.
// Privett should pass its own fixes: valid Organization, SoftwareApplication
// and FAQ schema, an llms.txt and a robots.txt that lets AI crawlers in.

export const SITE_URL = "https://www.useprivett.com";
export const CONTACT_EMAIL = "ed@useprivett.com";

/**
 * Monthly prices in GBP. These MUST match the live Stripe prices; Stripe is
 * what's actually charged. Agency is per branch, minimum two branches.
 */
export const PRICES_GBP = { starter: 39, pro: 99, agency: 79 } as const;

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Privett",
    url: SITE_URL,
    logo: `${SITE_URL}/privett-app-icon.svg`,
    email: CONTACT_EMAIL,
    description: "AI search visibility for UK estate and letting agents.",
    parentOrganization: { "@type": "Organization", name: "Welto Limited" },
  };
}

export function softwareApplicationSchema() {
  const offer = (name: string, price: number, unit: string) => ({
    "@type": "Offer",
    name,
    price: String(price),
    priceCurrency: "GBP",
    priceSpecification: { "@type": "UnitPriceSpecification", price: String(price), priceCurrency: "GBP", unitText: unit },
  });
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Privett",
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Tracks how often ChatGPT, Perplexity, Gemini and Claude name UK estate and letting agents, and shows what to fix.",
    offers: [
      offer("Starter", PRICES_GBP.starter, "per month"),
      offer("Pro", PRICES_GBP.pro, "per month"),
      offer("Agency", PRICES_GBP.agency, "per branch per month"),
      { "@type": "Offer", name: "Free scan", price: "0", priceCurrency: "GBP" },
    ],
  };
}

export function faqSchema(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };
}

/** Serialise JSON-LD safely for a <script> tag. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export const PUBLIC_PAGES = ["/", "/how-it-works", "/methodology", "/pricing", "/free-scan", "/sample-report", "/about", "/bot", "/privacy", "/terms"];

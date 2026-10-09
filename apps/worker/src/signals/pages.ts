// Classify crawled pages by URL, title and headings.

export type PageKind = "faq" | "team" | "fees" | "valuation";

const PATTERNS: Record<PageKind, { url: RegExp; text: RegExp }> = {
  faq: { url: /(faq|frequently-asked|questions)/i, text: /\b(faqs?|frequently asked questions)\b/i },
  team: { url: /(team|meet-the|our-people|staff|who-we-are)/i, text: /\b(our team|meet the team|meet our team|our people)\b/i },
  fees: { url: /(fees|charges|tariff|pricing)/i, text: /\b(our fees|fees|landlord fees|tenant fees|charges)\b/i },
  valuation: { url: /(valuation|value-my|valuate)/i, text: /\b(valuation|value my (home|house|property))\b/i },
};

export function classifyPage(url: string, title: string, headings: string[]): PageKind[] {
  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {
    // keep raw
  }
  const text = [title, ...headings].join(" | ");
  return (Object.keys(PATTERNS) as PageKind[]).filter((k) => PATTERNS[k].url.test(path) || PATTERNS[k].text.test(text));
}

export function slug(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Is this page about the area? Path contains its slug, or the title/H1 names it. */
export function isAreaPage(area: string, url: string, title: string, headings: string[]): boolean {
  const s = slug(area);
  if (!s) return false;
  let path = url;
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch {
    // keep raw
  }
  if (path.split("/").some((seg) => seg === s || seg.startsWith(`${s}-`) || seg.endsWith(`-${s}`) || seg.includes(`-${s}-`))) return true;
  const re = new RegExp(`\\b${area.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return re.test(title) || headings.some((h) => re.test(h));
}

/** Link priority for the crawl queue: pages that answer our questions first. */
export function linkPriority(href: string, text: string, areas: string[]): number {
  const t = `${href} ${text}`.toLowerCase();
  let p = 0;
  if (areas.some((a) => t.includes(a.toLowerCase()) || t.includes(slug(a)))) p += 5;
  for (const k of Object.keys(PATTERNS) as PageKind[]) if (PATTERNS[k].url.test(href) || PATTERNS[k].text.test(text)) p += 4;
  if (/(about|area|guide|sell|letting|landlord|contact)/.test(t)) p += 1;
  return p;
}

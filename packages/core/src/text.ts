// Name and domain normalisation shared by matching, competitor discovery and
// league tables.

// Trailing words that don't distinguish one agency from another.
const NOISE_WORDS = new Set([
  "estate",
  "estates",
  "agent",
  "agents",
  "agency",
  "letting",
  "lettings",
  "property",
  "properties",
  "residential",
  "sales",
  "and",
  "ltd",
  "limited",
  "llp",
  "plc",
  "co",
  "the",
  "uk",
]);

/** Lower-case, strip punctuation and generic suffixes. "Fox & Sons Estate Agents Ltd" -> "fox sons". */
export function normaliseAgentName(name: string): string {
  const words = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const kept = words.filter((w) => !NOISE_WORDS.has(w));
  // An agency literally called "The Property Agents" would vanish; keep raw then.
  return (kept.length ? kept : words).join(" ");
}

/** "https://www.Example.co.uk/path" -> "example.co.uk". Returns null if unparseable. */
export function normaliseDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/** True if host equals domain or is a subdomain of it. */
export function domainMatches(host: string | null, domain: string | null): boolean {
  if (!host || !domain) return false;
  const h = host.replace(/^www\./, "");
  const d = domain.replace(/^www\./, "");
  return h === d || h.endsWith(`.${d}`);
}

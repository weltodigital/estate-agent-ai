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

function wordsOf(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Lower-case, strip punctuation and generic suffixes. "Fox & Sons Estate
 * Agents Ltd" -> "fox sons". Spaced initials are joined ("A P Morgan" ->
 * "ap morgan"). Pass the branch's town and areas as `places` to drop branch
 * suffixes ("Hunters Stourbridge" -> "hunters"), so one agency isn't split
 * across its branch names.
 */
export function normaliseAgentName(name: string, places: string[] = []): string {
  const words = wordsOf(name);
  // Join runs of single letters: "a p morgan" -> "ap morgan".
  const joined: string[] = [];
  let inInitials = false;
  for (const w of words) {
    if (w.length === 1 && inInitials) {
      joined[joined.length - 1] += w;
    } else {
      joined.push(w);
      inInitials = w.length === 1;
    }
  }
  let kept = joined.filter((w) => !NOISE_WORDS.has(w));
  for (const place of places) {
    const pw = wordsOf(place);
    if (!pw.length) continue;
    const stripped = removeSequence(kept, pw);
    // Never strip a name down to nothing ("Stourbridge Estates").
    if (stripped.length) kept = stripped;
  }
  // An agency literally called "The Property Agents" would vanish; keep raw then.
  return (kept.length ? kept : joined).join(" ");
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


function removeSequence(words: string[], seq: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < words.length; ) {
    if (seq.every((s, j) => words[i + j] === s)) {
      i += seq.length;
    } else {
      out.push(words[i]!);
      i += 1;
    }
  }
  return out;
}

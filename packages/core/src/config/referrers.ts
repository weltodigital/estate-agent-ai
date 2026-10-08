// AI referral sources recognised by the tracking snippet. Config, not code:
// add a row here (or set AI_REFERRERS_JSON) when a new assistant appears.

export interface ReferrerSource {
  id: string;
  label: string;
  /** Referrer hostnames (suffix match). */
  hosts: string[];
  /** utm_source values, lower-cased. */
  utmSources: string[];
}

const DEFAULT_SOURCES: ReferrerSource[] = [
  { id: "chatgpt", label: "ChatGPT", hosts: ["chatgpt.com", "chat.openai.com"], utmSources: ["chatgpt.com", "chatgpt", "openai"] },
  { id: "perplexity", label: "Perplexity", hosts: ["perplexity.ai"], utmSources: ["perplexity", "perplexity.ai"] },
  { id: "gemini", label: "Gemini", hosts: ["gemini.google.com", "bard.google.com"], utmSources: ["gemini", "gemini.google.com"] },
  { id: "copilot", label: "Copilot", hosts: ["copilot.microsoft.com"], utmSources: ["copilot", "copilot.microsoft.com"] },
  { id: "claude", label: "Claude", hosts: ["claude.ai"], utmSources: ["claude", "claude.ai"] },
];

export function getReferrerSources(env: Record<string, string | undefined> = process.env): ReferrerSource[] {
  if (env.AI_REFERRERS_JSON) {
    try {
      return JSON.parse(env.AI_REFERRERS_JSON) as ReferrerSource[];
    } catch {
      console.warn("AI_REFERRERS_JSON is not valid JSON; using defaults");
    }
  }
  return DEFAULT_SOURCES;
}

/** Returns the AI source id for a visit, or null if it isn't from an AI assistant. */
export function classifyReferral(
  input: { referrer?: string | null; utmSource?: string | null },
  sources: ReferrerSource[] = getReferrerSources(),
): string | null {
  const utm = input.utmSource?.trim().toLowerCase();
  if (utm) {
    const hit = sources.find((s) => s.utmSources.includes(utm));
    if (hit) return hit.id;
  }
  if (input.referrer) {
    let host: string;
    try {
      host = new URL(input.referrer).hostname.toLowerCase();
    } catch {
      return null;
    }
    const hit = sources.find((s) => s.hosts.some((h) => host === h || host.endsWith(`.${h}`)));
    if (hit) return hit.id;
  }
  return null;
}

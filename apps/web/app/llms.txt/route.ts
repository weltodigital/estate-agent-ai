import { PRICES_GBP, SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

// A plain summary of Privett for AI tools (llms.txt convention).
export function GET() {
  const body = `# Privett

> Privett shows UK estate and letting agents how often ChatGPT, Perplexity, Gemini and Claude name them when sellers and landlords ask for an agent, who is named instead, and what to fix.

Privett asks AI assistants the questions people ask about agents in a town every week, several times each, records every agency named and the sources cited, and turns the gaps into evidence-backed fixes. It does not promise rankings.

Plans: Starter £${PRICES_GBP.starter} a month, Pro £${PRICES_GBP.pro} a month, Agency £${PRICES_GBP.agency} per branch a month. A free scan is available.

Made by Welto Limited, the team behind Subject to Contract, the weekly newsletter for UK estate agents.

## Key pages

- [How Privett works](${SITE_URL}/how-it-works)
- [Methodology](${SITE_URL}/methodology)
- [Pricing](${SITE_URL}/pricing)
- [Sample report](${SITE_URL}/sample-report)
- [Free scan](${SITE_URL}/free-scan)
- [About](${SITE_URL}/about)
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}

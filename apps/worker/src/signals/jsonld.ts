// JSON-LD extraction and the checks the missing_schema rule needs.

import type { WebsiteCrawlSignal } from "@privett/core";

type Node = Record<string, unknown>;

const AGENT_TYPES = ["RealEstateAgent"];
// LocalBusiness and the subtypes an agency site plausibly uses.
const LOCAL_BUSINESS_TYPES = ["LocalBusiness", "ProfessionalService", "RealEstateAgent", "HomeAndConstructionBusiness"];

function typesOf(n: Node): string[] {
  const t = n["@type"];
  const list = Array.isArray(t) ? t : t ? [t] : [];
  return list.filter((x): x is string => typeof x === "string").map((x) => x.replace(/^https?:\/\/schema\.org\//, ""));
}

function flatten(value: unknown, out: Node[] = []): Node[] {
  if (Array.isArray(value)) {
    for (const v of value) flatten(v, out);
  } else if (value && typeof value === "object") {
    const n = value as Node;
    if ("@graph" in n) flatten(n["@graph"], out);
    if ("@type" in n) out.push(n);
  }
  return out;
}

export function analyseJsonLd(blocks: string[]): WebsiteCrawlSignal["schema"] {
  const errors: string[] = [];
  const nodes: Node[] = [];
  blocks.forEach((raw, i) => {
    try {
      flatten(JSON.parse(raw.trim()), nodes);
    } catch {
      errors.push(`JSON-LD block ${i + 1} is not valid JSON`);
    }
  });
  const types = [...new Set(nodes.flatMap(typesOf))];
  const agentNodes = nodes.filter((n) => typesOf(n).some((t) => LOCAL_BUSINESS_TYPES.includes(t)));
  const hasRealEstateAgent = nodes.some((n) => typesOf(n).some((t) => AGENT_TYPES.includes(t)));
  const hasLocalBusiness = agentNodes.length > 0;
  const hasAddress = agentNodes.some((n) => !!n.address);
  const hasAggregateRating = nodes.some((n) => !!n.aggregateRating) || types.includes("AggregateRating");
  for (const n of agentNodes) if (!n.name) errors.push(`${typesOf(n).join("/")} has no name`);
  return {
    types,
    hasRealEstateAgent,
    hasLocalBusiness,
    hasAddress,
    hasAggregateRating,
    valid: hasLocalBusiness && errors.length === 0,
    errors,
  };
}

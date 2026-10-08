import { z } from "zod";

export const INTENT_GROUPS = ["selling", "valuation", "letting", "landlord", "comparison"] as const;
export type IntentGroup = (typeof INTENT_GROUPS)[number];

export const INTENT_LABELS: Record<IntentGroup, string> = {
  selling: "Selling",
  valuation: "Valuation",
  letting: "Letting",
  landlord: "Landlords",
  comparison: "Reviews and comparison",
};

// ---------------------------------------------------------------------------
// Engine adapter contract: runPrompt(engine, prompt) -> EngineAnswer
// ---------------------------------------------------------------------------

export interface EngineAnswer {
  answerText: string;
  citedUrls: string[];
  raw: unknown;
  model: string;
  usage: { inputTokens: number; outputTokens: number; searchCalls: number };
  costUsd: number;
}

// ---------------------------------------------------------------------------
// Parser output (structured JSON from the Anthropic API)
// ---------------------------------------------------------------------------

export const SENTIMENT_LABELS = ["positive", "neutral", "negative"] as const;

export const ParsedAgentSchema = z.object({
  /** Agency name as written in the answer. */
  name: z.string(),
  /** 1 = first agent named. */
  position: z.number().int(),
  /** Website host if the answer associates one with the agent, else null. */
  domain: z.string().nullable(),
  sentiment_label: z.enum(SENTIMENT_LABELS),
  sentiment_score: z.number().int(),
  /** Up to 5 short words or phrases the answer uses to describe the agent. */
  descriptors: z.array(z.string()),
});

export const ParsedAnswerSchema = z.object({
  /** Every estate or letting agency named, in order of first appearance. */
  agents: z.array(ParsedAgentSchema),
  /** Short note when the answer declines to name agents or is off-topic. */
  notes: z.string().nullable(),
});

export type ParsedAgent = z.infer<typeof ParsedAgentSchema>;
export type ParsedAnswer = z.infer<typeof ParsedAnswerSchema>;

// ---------------------------------------------------------------------------
// Signals
// ---------------------------------------------------------------------------

export interface WebsiteCrawlSignal {
  ok: boolean;
  error?: string;
  homepageUrl: string;
  fetchedPages: number;
  schema: {
    types: string[];
    hasRealEstateAgent: boolean;
    hasLocalBusiness: boolean;
    hasAddress: boolean;
    hasAggregateRating: boolean;
    valid: boolean;
    errors: string[];
  };
  pages: {
    /** Areas (from branch.areas and prompt areas) that have a page, with url. */
    areaPages: { area: string; url: string | null }[];
    faqUrl: string | null;
    teamUrl: string | null;
    feesUrl: string | null;
    valuationUrl: string | null;
  };
  robots: {
    fetched: boolean;
    /** AI crawlers fully disallowed, with the matching rule. */
    blockedBots: { bot: string; rule: string }[];
    raw: string | null;
  };
  llmsTxt: boolean;
  titleMentionsTown: boolean;
  metaMentionsTown: boolean;
  speed: { ttfbMs: number | null; htmlKb: number | null };
}

export interface GoogleBusinessSignal {
  found: boolean;
  placeId: string | null;
  name: string | null;
  rating: number | null;
  reviewCount: number | null;
  /** Reviews in the last 90 days among those the API returns, null if unknown. */
  recentReviews90d: number | null;
  categories: string[];
  /** 0-100, share of key profile fields present. */
  completeness: number | null;
  missingFields: string[];
}

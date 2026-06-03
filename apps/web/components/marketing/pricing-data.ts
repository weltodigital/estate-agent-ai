/**
 * Marketing pricing data.
 *
 * TODO(pricing): hardcoded here for the marketing site. There is no price
 * constants file in packages/shared yet (constants.ts holds TIER_LIMITS for
 * usage soft-limits, not prices or headline allowances). When billing prices
 * are formalised, extract these to packages/shared and reconcile the headline
 * "listings" allowance below with TIER_LIMITS.listing_created.
 */

export type Tier = {
  name: string;
  /** Monthly price in GBP, whole pounds. */
  price: number;
  /** Headline listings allowance, e.g. "Up to 8 listings". */
  listings: string;
  popular?: boolean;
  /** Full feature bullets shown on the /pricing cards. */
  features: string[];
};

export const TIERS: Tier[] = [
  {
    name: "Starter",
    price: 29,
    listings: "Up to 8 listings",
    features: [
      "Auto-enhanced photos",
      "AI staging — 5 rooms a month",
      "Floor plans from a sketch",
      "AI listing descriptions",
      "EPC lookups",
      "1 user, 1 branch",
    ],
  },
  {
    name: "Pro",
    price: 59,
    listings: "Up to 18 listings",
    popular: true,
    features: [
      "Everything in Starter",
      "AI staging — 25 rooms a month",
      "More floor plans and descriptions",
      "Priority processing",
      "3 users, 1 branch",
    ],
  },
  {
    name: "Business",
    price: 99,
    listings: "Up to 35 listings",
    features: [
      "Everything in Pro",
      "AI staging — 100 rooms a month",
      "Higher monthly allowances",
      "10 users, up to 3 branches",
    ],
  },
  {
    name: "Agency",
    price: 159,
    listings: "Up to 60 listings",
    features: [
      "Everything in Business",
      "Unlimited AI staging",
      "Unlimited users",
      "Unlimited branches",
    ],
  },
];

/**
 * Row-by-row comparison for the /pricing "What's included" table. Order of
 * values matches the order of TIERS (Starter, Pro, Business, Agency).
 */
export const COMPARISON_ROWS: { label: string; values: [string, string, string, string] }[] = [
  { label: "Listings / mo", values: ["8", "18", "35", "60"] },
  { label: "Auto-enhanced photos", values: ["50", "250", "1,000", "Unlimited"] },
  { label: "AI staging rooms", values: ["5", "25", "100", "Unlimited"] },
  { label: "AI floor plans", values: ["3", "15", "60", "Unlimited"] },
  { label: "Social videos", values: ["—", "—", "—", "Unlimited"] },
  { label: "AI descriptions", values: ["20", "100", "500", "Unlimited"] },
  { label: "EPC lookups", values: ["50", "250", "1,000", "Unlimited"] },
  { label: "Users", values: ["1", "3", "10", "Unlimited"] },
  { label: "Branches", values: ["1", "1", "3", "Unlimited"] },
];

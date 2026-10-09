// Plans and their limits. Prices live in Stripe (display labels in env); this file maps
// Stripe price ids (from env) to a plan and holds the limits we enforce
// server-side. Never trust the client for any of these.

import type { EngineId } from "./engines";

export type PlanId = "free" | "starter" | "pro" | "agency";

export interface PlanLimits {
  /** Max active branches. For per-branch plans this is the purchased quantity, capped here. */
  maxBranches: number;
  /** Minimum billable branches (Agency starts at 2). */
  minBranches: number;
  promptsPerBranch: number;
  /** Minimum days between scheduled scans. */
  scanIntervalDays: number;
  /** Manual "scan now" runs allowed per branch per rolling 7 days. */
  manualScansPerWeek: number;
  engines: EngineId[];
  runsPerPrompt: number;
  /** Hard cost cap per scan run, USD. */
  scanBudgetUsd: number;
}

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  /** Stripe price id, from env. Absent for free. */
  stripePriceId?: string;
  perBranch: boolean;
  limits: PlanLimits;
}

type Env = Record<string, string | undefined>;

const ALL_ENGINES: EngineId[] = ["openai", "perplexity", "gemini", "anthropic"];

// Sized for ~70%+ gross margin at measured/estimated per-answer costs
// (ChatGPT ~$0.034, Gemini ~$0.037, Claude ~$0.07, Perplexity ~$0.002):
// Starter ~£10, Pro ~£28, Agency ~£22 per branch per month incl. Stripe fees.
// Budgets are ~1.5x the expected cost of one scan.
export function getPlans(env: Env = process.env): Record<PlanId, PlanConfig> {
  return {
    free: {
      id: "free",
      name: "Free scan",
      description: "A one-off snapshot of how AI answers questions about your town.",
      perBranch: false,
      limits: {
        maxBranches: 1,
        minBranches: 1,
        promptsPerBranch: 5,
        scanIntervalDays: 36500, // once
        manualScansPerWeek: 0,
        engines: ["openai", "perplexity"],
        runsPerPrompt: 1,
        scanBudgetUsd: Number(env.FREE_SCAN_BUDGET_USD ?? 0.75),
      },
    },
    starter: {
      id: "starter",
      name: "Starter",
      description: "Weekly tracking on ChatGPT, Perplexity and Gemini for one branch.",
      stripePriceId: env.STRIPE_PRICE_STARTER,
      perBranch: true,
      limits: {
        maxBranches: 1,
        minBranches: 1,
        promptsPerBranch: 12,
        scanIntervalDays: 7,
        manualScansPerWeek: 1,
        engines: ["openai", "perplexity", "gemini"],
        runsPerPrompt: 3,
        scanBudgetUsd: Number(env.STARTER_SCAN_BUDGET_USD ?? 4),
      },
    },
    pro: {
      id: "pro",
      name: "Pro",
      description: "Weekly tracking on all four assistants for one branch, with more questions.",
      stripePriceId: env.STRIPE_PRICE_PRO,
      perBranch: true,
      limits: {
        maxBranches: 1,
        minBranches: 1,
        promptsPerBranch: 18,
        scanIntervalDays: 7,
        manualScansPerWeek: 1,
        engines: ALL_ENGINES,
        runsPerPrompt: 3,
        scanBudgetUsd: Number(env.PRO_SCAN_BUDGET_USD ?? 12),
      },
    },
    agency: {
      id: "agency",
      name: "Agency",
      description: "Every branch tracked weekly on all four assistants, billed per branch.",
      stripePriceId: env.STRIPE_PRICE_AGENCY,
      perBranch: true,
      limits: {
        maxBranches: 50,
        minBranches: 2,
        promptsPerBranch: 14,
        scanIntervalDays: 7,
        manualScansPerWeek: 1,
        engines: ALL_ENGINES,
        runsPerPrompt: 3,
        scanBudgetUsd: Number(env.AGENCY_SCAN_BUDGET_USD ?? 10),
      },
    },
  };
}

export function planForPriceId(priceId: string | null | undefined, env: Env = process.env): PlanId | null {
  if (!priceId) return null;
  const plans = getPlans(env);
  for (const p of Object.values(plans)) if (p.stripePriceId === priceId) return p.id;
  return null;
}

/** Stripe statuses that grant paid access. */
export const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"] as const;

export interface SubscriptionLike {
  plan_id: string;
  status: string;
  branch_quantity: number;
}

/** Effective limits for an org given its subscriptions (best active one wins). */
export function effectiveLimits(
  subs: SubscriptionLike[],
  env: Env = process.env,
): { planId: PlanId; limits: PlanLimits; paid: boolean } {
  const plans = getPlans(env);
  const active = subs.filter((s) =>
    (ACTIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(s.status),
  );
  const best =
    (["agency", "pro", "starter"] as const).map((id) => active.find((s) => s.plan_id === id)).find(Boolean) ?? null;
  if (!best) return { planId: "free", limits: plans.free.limits, paid: false };
  const plan = plans[best.plan_id as PlanId];
  return {
    planId: plan.id,
    paid: true,
    limits: {
      ...plan.limits,
      maxBranches: plan.perBranch
        ? Math.min(Math.max(best.branch_quantity, 1), plan.limits.maxBranches)
        : plan.limits.maxBranches,
    },
  };
}

import { describe, expect, it } from "vitest";
import { effectiveLimits, getPlans, planForPriceId } from "./plans";

const env = { STRIPE_PRICE_STARTER: "price_s", STRIPE_PRICE_PRO: "price_p", STRIPE_PRICE_AGENCY: "price_a" };

describe("plans", () => {
  it("maps Stripe prices to plans", () => {
    expect(planForPriceId("price_a", env)).toBe("agency");
    expect(planForPriceId("price_x", env)).toBeNull();
  });
  it("gives Starter three assistants and Pro all four", () => {
    const p = getPlans(env);
    expect(p.starter.limits.engines).toEqual(["openai", "perplexity", "gemini"]);
    expect(p.pro.limits.engines).toHaveLength(4);
    expect(p.agency.limits.minBranches).toBe(2);
  });
  it("uses the best active subscription and its branch quantity", () => {
    const r = effectiveLimits(
      [
        { plan_id: "starter", status: "active", branch_quantity: 1 },
        { plan_id: "agency", status: "active", branch_quantity: 5 },
      ],
      env,
    );
    expect(r).toMatchObject({ planId: "agency", paid: true });
    expect(r.limits.maxBranches).toBe(5);
    expect(effectiveLimits([{ plan_id: "pro", status: "canceled", branch_quantity: 1 }], env).planId).toBe("free");
  });
});

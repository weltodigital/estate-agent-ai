import { test as base } from "@playwright/test";

/**
 * Playwright fixture that skips the suite when the required infra envs aren't
 * present. CI without Supabase + API endpoints set will skip cleanly instead
 * of failing the lane.
 */
export const test = base.extend<Record<string, never>>({});

export const requireLocalInfra = () => {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (missing.length) {
    test.skip(true, `Missing env: ${missing.join(", ")}. Start Supabase + API locally to run.`);
  }
};

export const uniqueEmail = (prefix = "e2e") => {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `${prefix}+${suffix}@estate-agent-ai.test`;
};

export { expect } from "@playwright/test";

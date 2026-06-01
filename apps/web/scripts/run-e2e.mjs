#!/usr/bin/env node
/**
 * Runs Playwright e2e tests, but skips cleanly when the env required to talk
 * to Supabase + the API isn't set. This keeps CI green without forcing every
 * runner to install browsers + start the full stack.
 */
import { spawnSync } from "node:child_process";

const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.log(`[e2e] skipped — missing env: ${missing.join(", ")}`);
  process.exit(0);
}

const result = spawnSync("playwright", ["test", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);

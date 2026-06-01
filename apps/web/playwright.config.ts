import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Only auto-spawn the dev server when we have envs to talk to (Supabase +
  // API). CI without those skips the suite — see tests/e2e/_skip.ts.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : process.env.NEXT_PUBLIC_SUPABASE_URL
      ? {
          command: "pnpm dev",
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          stdout: "ignore",
          stderr: "pipe",
        }
      : undefined,
});

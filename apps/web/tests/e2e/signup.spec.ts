import { expect, requireLocalInfra, test, uniqueEmail } from "./_skip";

test.describe("signup", () => {
  test.beforeAll(() => {
    requireLocalInfra();
  });

  test("creates an agency and lands on the dashboard", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /create your agency/i })).toBeVisible();

    const email = uniqueEmail("signup");
    await page.getByLabel(/your full name/i).fill("Eddy Tester");
    await page.getByLabel(/work email/i).fill(email);
    await page.getByLabel(/^password$/i).fill("CorrectHorse9!");
    await page.getByLabel(/agency name/i).fill(`Acme Estates ${Date.now()}`);
    await page.getByLabel(/branch postcode/i).fill("SW1A 1AA");

    await page.getByRole("button", { name: /create agency/i }).click();

    // Either we land on /dashboard, or we get the "check your inbox" screen
    // if the local Supabase has email confirmation on.
    await Promise.race([
      page.waitForURL(/\/dashboard/, { timeout: 15_000 }),
      page.getByText(/check your inbox/i).waitFor({ timeout: 15_000 }),
    ]);
  });

  test("shows validation errors on empty submit", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("button", { name: /create agency/i }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();
  });
});

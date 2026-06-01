import { expect, requireLocalInfra, test } from "./_skip";

test.describe("login", () => {
  test.beforeAll(() => {
    requireLocalInfra();
  });

  test("rejects unknown credentials", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /log in/i })).toBeVisible();

    await page.getByLabel(/email/i).fill("does-not-exist@estate-agent-ai.test");
    await page.getByLabel(/password/i).fill("WrongPassword!");
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(page.getByRole("alert")).toBeVisible();
  });

  test("magic link button shows confirmation", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("magic@estate-agent-ai.test");
    await page.getByRole("button", { name: /magic link/i }).click();
    await expect(page.getByText(/magic link sent/i)).toBeVisible({ timeout: 10_000 });
  });
});

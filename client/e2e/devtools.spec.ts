import { test, expect } from "@playwright/test";

// Runs against `npm run dev:tools` (port 5175), not the default e2e server.
test.use({ baseURL: "http://localhost:5175" });

test("dev panel signs in as each persona without creating accounts", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Dev tools" }).click();
  await page.getByRole("button", { name: "Sign in as student" }).click();
  await expect(page).toHaveURL(/\/student\/dashboard$/);
  await expect(page.getByRole("main")).toBeVisible();
  await page.getByRole("button", { name: "Dev tools" }).click();
  await page.getByRole("button", { name: "Sign in as peer facilitator" }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await expect(page.getByRole("main")).toBeVisible();
});

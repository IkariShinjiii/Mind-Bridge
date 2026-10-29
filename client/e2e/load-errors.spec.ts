import { test, expect } from "@playwright/test";
import { seed, logIn, STUDENT } from "./helpers";

test.describe("Failed loads", () => {
  test("the dashboard offers Try again and recovers when the connection is back", async ({ page }) => {
    await seed(page);
    await logIn(page, STUDENT);
    await page.evaluate(() => localStorage.setItem("mb_e2e_fail_reads", "appointments"));
    await page.reload();

    const banner = page.getByRole("alert").filter({ hasText: "could not load" });
    await expect(banner).toBeVisible();

    await page.evaluate(() => localStorage.removeItem("mb_e2e_fail_reads"));
    await banner.getByRole("button", { name: "Try again" }).click();
    await expect(banner).toHaveCount(0);
  });

  test("a profile that fails to load is never shown as a blank form that could overwrite it", async ({ page }) => {
    await seed(page);
    await logIn(page, STUDENT);
    await page.evaluate(() => localStorage.setItem("mb_e2e_fail_docs", "users"));
    // Navigate inside the app: a reload would make the sign-in profile read fail too.
    await page.getByRole("button", { name: /Account menu for/ }).click();
    await page.getByRole("menuitem", { name: "Account settings" }).click();

    const banner = page.getByRole("alert").filter({ hasText: "Could not load your settings" });
    await expect(banner).toBeVisible();
    await expect(page.getByRole("button", { name: /save/i })).toHaveCount(0);

    await page.evaluate(() => localStorage.removeItem("mb_e2e_fail_docs"));
    await banner.getByRole("button", { name: "Try again" }).click();
    await expect(banner).toHaveCount(0);
    await expect(page.getByRole("button", { name: /save/i }).first()).toBeVisible();
  });
});

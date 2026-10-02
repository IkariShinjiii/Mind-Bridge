import { test, expect } from "@playwright/test";
import { seed, logIn, STUDENT, COUNSELOR } from "./helpers";

test.describe("Appearance setting", () => {
  test("the nav bar has no theme toggle", async ({ page }) => {
    await seed(page);
    await logIn(page, STUDENT);

    await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Switch to (dark|light) mode/ })).toHaveCount(0);
  });

  for (const person of [STUDENT, COUNSELOR]) {
    test(`${person.email} can switch to dark in Settings and it is remembered`, async ({ page }) => {
      await seed(page);
      await logIn(page, person);
      await page.goto("/settings");

      const themed = page.locator(".mb").first();
      await expect(themed).toHaveAttribute("data-theme", "light");

      await page.getByRole("button", { name: "Appearance" }).click();
      await page.getByRole("radio", { name: /Dark/ }).check({ force: true });

      await expect(themed).toHaveAttribute("data-theme", "dark");
      expect(await page.evaluate(() => localStorage.getItem("mindbridge_theme"))).toBe("dark");

      await page.reload();
      await expect(page.locator(".mb").first()).toHaveAttribute("data-theme", "dark");

      await page.getByRole("button", { name: "Appearance" }).click();
      await expect(page.getByRole("radio", { name: /Dark/ })).toBeChecked();
    });
  }
});

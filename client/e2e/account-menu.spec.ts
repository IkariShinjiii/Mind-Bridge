import { test, expect } from "@playwright/test";
import { seed, logIn, STUDENT } from "./helpers";

// The account menu has two homes: the sidebar row (desktop) and the avatar in the phone top bar.
// Both must work from the keyboard alone.
for (const [label, viewport] of [
  ["sidebar", { width: 1280, height: 800 }],
  ["phone top bar", { width: 390, height: 800 }],
] as const) {
  test(`account menu works from the keyboard in the ${label}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await seed(page);
    await logIn(page, STUDENT);
    await page.goto("/student/dashboard");

    const button = page.getByRole("button", { name: /Account menu for/ });
    await button.focus();
    await page.keyboard.press("Enter");

    const menu = page.getByRole("menu", { name: "Account" });
    await expect(menu).toBeVisible();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("menuitem", { name: "Account settings" })).toBeFocused();

    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("menuitem", { name: "Account settings" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute("aria-expanded", "false");
  });
}

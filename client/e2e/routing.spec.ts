import { test, expect } from "@playwright/test";
import { seed, logIn, STUDENT, COUNSELOR } from "./helpers";

// Route-level behaviour that the role specs only touch in passing: legacy URL, 404, and signed-in visitors on public-only pages.
test.describe("Routing", () => {
  test("an unknown address shows the not-found page, not a blank screen", async ({ page }) => {
    await seed(page);
    await page.goto("/definitely/not/a/page");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("body")).not.toBeEmpty();
    await expect(page.getByText(/not found|404|can.t find/i).first()).toBeVisible();
  });

  test("the old /counselor/dashboard address lands counselors on the staff dashboard", async ({ page }) => {
    await seed(page);
    await logIn(page, COUNSELOR);
    await expect(page.getByRole("heading", { name: "Staff dashboard" })).toBeVisible();
    await page.goto("/counselor/dashboard");
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
  });

  test("a signed-in student visiting /login or /signup is sent to their dashboard", async ({ page }) => {
    await seed(page);
    await logIn(page, STUDENT);
    await expect(page).toHaveURL(/\/student\/dashboard$/);
    for (const path of ["/login", "/signup"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/student\/dashboard$/);
    }
  });

  test("a signed-in counselor visiting /login is sent to the staff dashboard", async ({ page }) => {
    await seed(page);
    await logIn(page, COUNSELOR);
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
  });

  test("a student who types the staff dashboard address is sent back to their own dashboard", async ({ page }) => {
    await seed(page);
    await logIn(page, STUDENT);
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/student\/dashboard$/);
  });

  test("the public legal pages open without an account", async ({ page }) => {
    await seed(page);
    for (const path of ["/privacy-policy", "/terms", "/cookie-policy"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });
});

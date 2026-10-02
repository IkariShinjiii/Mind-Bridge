import { test, expect } from "@playwright/test";
import { seed, logIn, STUDENT } from "./helpers";

test.describe("Page titles and head tags", () => {
  test("every route has its own title, announced on navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Mind Bridge | University of San Agustin Guidance Services");

    await page.goto("/login");
    await expect(page).toHaveTitle("Log in | Mind Bridge");

    await page.goto("/privacy-policy");
    await expect(page).toHaveTitle("Privacy Policy | Mind Bridge");

    await page.goto("/no-such-page");
    await expect(page).toHaveTitle("Page not found | Mind Bridge");
  });

  test("the title follows in-app navigation when signed in", async ({ page }) => {
    await seed(page);
    await logIn(page, STUDENT);
    await expect(page).toHaveTitle("Dashboard | Mind Bridge");

    await page.getByRole("link", { name: "Crisis resources" }).first().click();
    await expect(page).toHaveTitle("Crisis resources | Mind Bridge");
  });

  test("the page declares a description, a favicon and a sharing preview", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /private wellness check-in/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /og-image\.png$/);

    for (const href of await page
      .locator('link[rel="icon"], link[rel="apple-touch-icon"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute("href") ?? ""))) {
      expect((await request.get(href)).ok(), `${href} should be served`).toBe(true);
    }
    expect((await request.get("/og-image.png")).ok()).toBe(true);
    expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /admin/");
  });
});

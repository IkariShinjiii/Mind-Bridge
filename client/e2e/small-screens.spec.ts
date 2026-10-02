import { test, expect, type Page } from "@playwright/test";
import { seed, logIn, STUDENT, COUNSELOR } from "./helpers";

// The app clips horizontal overflow (overflow-x: hidden), so a too-wide element is cut off silently
// instead of scrolling. These tests fail when anything sits past the right edge of a small phone.
const WIDTHS = [320, 375];

async function elementsPastEdge(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const viewport = window.innerWidth;
    return [...document.querySelectorAll("body *")]
      .filter((el) => {
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return (
          box.width > 0 &&
          (box.right > viewport + 1 || box.left < -1) &&
          style.position !== "fixed" &&
          style.visibility !== "hidden" &&
          !el.closest(".sr-only") &&
          // Intentional: the settings section list scrolls sideways on phones.
          !el.closest("nav[aria-label='Settings sections']")
        );
      })
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)}`);
  });
}

for (const width of WIDTHS) {
  test.describe(`${width}px wide`, () => {
    test.use({ viewport: { width, height: 700 } });

    test("public pages fit", async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("mindbridge_cookie_consent", "accepted"));
      for (const path of ["/", "/login", "/signup", "/privacy-policy", "/no-such-page"]) {
        await page.goto(path);
        await expect(page.getByRole("main")).toBeVisible();
        expect(await elementsPastEdge(page), path).toEqual([]);
      }
    });

    test("student pages fit, including the crisis hotline numbers", async ({ page }) => {
      await seed(page);
      await logIn(page, STUDENT);
      for (const path of ["/student/dashboard", "/resources", "/appointments", "/settings"]) {
        await page.goto(path);
        await expect(page.getByRole("main")).toBeVisible();
        expect(await elementsPastEdge(page), path).toEqual([]);
      }
      await page.goto("/resources");
      const landline = page.getByRole("link", { name: /Call Hopeline Philippines, PLDT landline/ });
      await landline.scrollIntoViewIfNeeded();
      const box = await landline.boundingBox();
      expect(box, "hotline link is rendered").not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    });

    test("staff dashboard fits", async ({ page }) => {
      await seed(page);
      await logIn(page, COUNSELOR);
      await expect(page.getByRole("heading", { name: "Staff dashboard" })).toBeVisible();
      expect(await elementsPastEdge(page), "staff dashboard").toEqual([]);
    });
  });
}

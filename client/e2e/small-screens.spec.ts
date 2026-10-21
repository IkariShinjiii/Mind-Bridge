import { test, expect, type Page } from "@playwright/test";
import { seed, logIn, STUDENT, COUNSELOR } from "./helpers";

// The app clips horizontal overflow (overflow-x: hidden), so a too-wide element is cut off silently
// instead of scrolling. These tests fail when anything sits past the right edge of a small phone.
const WIDTHS = [320, 375, 768, 1024];

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
          // Intentional: these strips scroll sideways on phones.
          !el.closest("nav[aria-label='Settings sections']") &&
          !el.closest("[aria-label='Filter appointments by status']") &&
          !el.closest("[aria-label='Filter cases']")
        );
      })
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)}`);
  });
}

/** Links and buttons that are visible but smaller than 44 x 44 px. */
async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll("a, button")]
      .filter((el) => !el.closest(".sr-only, .mb-skip"))
      .map((el) => ({ el, box: el.getBoundingClientRect() }))
      .filter(({ el, box }) => box.width > 0 && box.height > 0 && getComputedStyle(el).visibility !== "hidden")
      .filter(({ box }) => box.width < 43.5 || box.height < 43.5)
      .map(({ el, box }) => `${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30)} ${Math.round(box.width)}x${Math.round(box.height)}`),
  );
}

test.describe("dashboard touch targets on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("student dashboard", async ({ page }) => {
    await seed(page);
    await logIn(page, STUDENT);
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
    expect(await smallTargets(page)).toEqual([]);
  });

  test("staff dashboard", async ({ page }) => {
    await seed(page);
    await logIn(page, COUNSELOR);
    await expect(page.getByRole("heading", { name: "Staff dashboard" })).toBeVisible();
    expect(await smallTargets(page)).toEqual([]);
  });
});

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
      const landline = page.getByRole("link", { name: /Call Hopeline Philippines: PLDT landline/ });
      await landline.scrollIntoViewIfNeeded();
      const box = await landline.boundingBox();
      expect(box, "hotline link is rendered").not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    });

    test("the crisis line is in the top bar on every phone width, for students only", async ({ page }) => {
      test.skip(width >= 1024, "from 1024 px the sidebar carries it");
      await seed(page);
      await logIn(page, STUDENT);
      const crisis = page.getByRole("banner").getByRole("link", { name: /1553/ });
      await expect(crisis).toBeVisible();
      const box = await crisis.boundingBox();
      expect(box!.y + box!.height).toBeLessThanOrEqual(80);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      await page.getByRole("button", { name: /Account menu/ }).click();
      await page.getByRole("menuitem", { name: "Sign out" }).click();
      await logIn(page, COUNSELOR);
      await expect(page.getByRole("heading", { name: "Staff dashboard" })).toBeVisible();
      await expect(page.getByRole("banner").getByRole("link", { name: /1553/ })).toHaveCount(0);
    });

    test("staff dashboard fits", async ({ page }) => {
      await seed(page);
      await logIn(page, COUNSELOR);
      await expect(page.getByRole("heading", { name: "Staff dashboard" })).toBeVisible();
      expect(await elementsPastEdge(page), "staff dashboard").toEqual([]);
    });
  });
}

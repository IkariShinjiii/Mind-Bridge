import { test, expect } from "@playwright/test";

// The suite defaults to reduced motion (which skips the fade), so this spec turns animations back on.
test.use({ reducedMotion: "no-preference" });

// A route whose code is still loading must not leave the page stuck at opacity 0 (it used to stay invisible until refresh).
test("a page opened directly fades in even when its code loads slowly", async ({ page }) => {
  await page.route(/\/src\/pages\/auth\/Login\.tsx/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.continue();
  });

  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1 })).toBeAttached();

  await expect
    .poll(() =>
      page.evaluate(() => {
        let el: Element | null = document.querySelector("h1");
        let min = 1;
        while (el && el !== document.body) {
          min = Math.min(min, Number(getComputedStyle(el).opacity));
          el = el.parentElement;
        }
        return min;
      }),
    )
    .toBe(1);
});

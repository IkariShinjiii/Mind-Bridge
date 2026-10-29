import { test, expect } from "@playwright/test";
import { seed, logIn, STUDENT } from "./helpers";

test.describe("Offline notice", () => {
  test("appears while the device is offline and goes away when it reconnects", async ({ page, context }) => {
    await seed(page);
    await logIn(page, STUDENT);
    const notice = page.getByRole("status").filter({ hasText: "You are offline" });
    await expect(notice).toHaveCount(0);

    await context.setOffline(true);
    await expect(notice).toBeVisible();

    await context.setOffline(false);
    await expect(notice).toHaveCount(0);
  });

  test("never covers the crisis button on a phone", async ({ page, context }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await seed(page);
    await logIn(page, STUDENT);
    const crisis = page.getByRole("link", { name: /Crisis\s*1553/ }).first();
    await expect(crisis).toBeVisible();

    await context.setOffline(true);
    const notice = page.getByRole("status").filter({ hasText: "You are offline" });
    await expect(notice).toBeVisible();

    const a = (await crisis.boundingBox())!;
    const b = (await notice.boundingBox())!;
    const overlap = a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    expect(overlap).toBe(false);
    // And it fits the screen
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(360);
  });
});

test("the site is installable: manifest, icons and service worker are served", async ({ request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/");
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true);
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  const sw = await request.get("/sw.js");
  expect(sw.ok()).toBe(true);
  expect(await sw.text()).toContain('startsWith("/api/")');
});

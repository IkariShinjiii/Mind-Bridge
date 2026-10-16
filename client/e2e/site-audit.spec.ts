import { test, expect, type Page } from "@playwright/test";
import { seed, logIn, STUDENT, COUNSELOR } from "./helpers";

// Launch checklist: every page on a small phone has no sideways scroll, no dead internal links, no unnamed
// buttons or links, no images without alt, and no console errors.
test.use({ viewport: { width: 320, height: 700 } });

const PUBLIC = ["/", "/login", "/signup", "/privacy-policy", "/terms", "/cookie-policy", "/no-such-page"];
const STUDENT_PAGES = ["/student/dashboard", "/resources", "/appointments", "/settings"];
const STAFF_PAGES = ["/admin/dashboard", "/appointments", "/settings"];

async function audit(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole("main")).toBeVisible();
  const found = await page.evaluate(() => {
    const doc = document.documentElement;
    const unnamed = [...document.querySelectorAll("a, button, [role=button]")]
      .filter((el) => {
        const box = el.getBoundingClientRect();
        if (box.width === 0 || getComputedStyle(el).visibility === "hidden") return false;
        const label = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.getAttribute("title");
        return !label && !(el as HTMLElement).innerText.trim();
      })
      .map((el) => el.outerHTML.slice(0, 80));
    const noAlt = [...document.querySelectorAll("img:not([alt])")].map((el) => el.outerHTML.slice(0, 80));
    const hrefs = [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href") as string);
    return { scrollW: doc.scrollWidth, clientW: doc.clientWidth, unnamed, noAlt, hrefs };
  });
  expect(found.scrollW, `${path} page scrolls sideways`).toBeLessThanOrEqual(found.clientW);
  expect(found.unnamed, `${path} unnamed controls`).toEqual([]);
  expect(found.noAlt, `${path} images without alt`).toEqual([]);
  return found.hrefs.filter((h) => h.startsWith("/") && !h.startsWith("//"));
}

async function checkLinks(page: Page, hrefs: Set<string>) {
  for (const href of hrefs) {
    await page.goto(href);
    await expect(page.getByRole("main"), href).toBeVisible();
    await expect(page, `${href} is a dead link`).not.toHaveTitle(/Page not found/);
  }
}

test("public pages are clean and their links resolve", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem("mindbridge_cookie_consent", "accepted"));
  const links = new Set<string>();
  for (const path of PUBLIC) (await audit(page, path)).forEach((h) => links.add(h));
  await checkLinks(page, links);
  expect(errors).toEqual([]);
});

test("student pages are clean and their links resolve", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seed(page);
  await logIn(page, STUDENT);
  const links = new Set<string>();
  for (const path of STUDENT_PAGES) (await audit(page, path)).forEach((h) => links.add(h));
  await checkLinks(page, links);
  expect(errors).toEqual([]);
});

test("staff pages are clean and their links resolve", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seed(page);
  await logIn(page, COUNSELOR);
  const links = new Set<string>();
  for (const path of STAFF_PAGES) (await audit(page, path)).forEach((h) => links.add(h));
  await checkLinks(page, links);
  expect(errors).toEqual([]);
});

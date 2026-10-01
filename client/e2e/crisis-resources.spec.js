import { test, expect } from "@playwright/test";
import { seed, logIn, STUDENT } from "./helpers.js";

test.describe("Crisis resources page", () => {
  test.beforeEach(async ({ page }) => {
    await seed(page);
    await logIn(page, STUDENT);
    await expect(page).toHaveURL(/\/student\/dashboard$/);
  });

  test("a student reaches the page from the main navigation", async ({ page }) => {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Crisis resources" }).click();

    await expect(page).toHaveURL(/\/resources$/);
    await expect(page.getByRole("heading", { level: 1, name: "Crisis resources" })).toBeVisible();
    await expect(page.getByRole("note")).toContainText("call your local emergency number");
  });

  test("both national hotlines list every number as a tap-to-call link", async ({ page }) => {
    await page.goto("/resources");

    const ncmh = page.getByRole("region", { name: "NCMH Crisis Hotline" });
    await expect(ncmh).toContainText("24/7 nationwide, toll-free");
    await expect(ncmh.getByRole("link", { name: /1553/ })).toHaveAttribute("href", "tel:1553");
    await expect(ncmh.getByRole("link", { name: /0917-899-8727/ })).toHaveAttribute("href", "tel:+639178998727");
    await expect(ncmh.getByRole("link", { name: /0966-351-4518/ })).toHaveAttribute("href", "tel:+639663514518");

    const hopeline = page.getByRole("region", { name: "Hopeline Philippines" });
    await expect(hopeline).toContainText("24/7 crisis and suicide prevention");
    await expect(hopeline.getByRole("link", { name: /0917-558-4673/ })).toHaveAttribute("href", "tel:+639175584673");
    await expect(hopeline.getByRole("link", { name: /0918-873-4673/ })).toHaveAttribute("href", "tel:+639188734673");
    await expect(hopeline.getByRole("link", { name: /\(02\) 8804-4673/ })).toHaveAttribute("href", "tel:+63288044673");
  });

  test("the campus guidance center shows its location, hours and confidentiality", async ({ page }) => {
    await page.goto("/resources");

    const campus = page.getByRole("region", { name: "University of San Agustin Guidance Center" });
    await expect(campus).toContainText("Blanco Hall");
    await expect(campus).toContainText("Monday to Friday, 8:00 AM to 5:00 PM");
    await expect(campus).toContainText("RA 11036");
  });

  test("Book an on-campus session takes the student to appointments", async ({ page }) => {
    await page.goto("/resources");

    await page.getByRole("link", { name: "Book an on-campus session" }).click();

    await expect(page).toHaveURL(/\/appointments$/);
  });

  test("the Back button returns to the previous page", async ({ page }) => {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Crisis resources" }).click();
    await expect(page).toHaveURL(/\/resources$/);

    await page.getByRole("button", { name: "Back" }).click();

    await expect(page).toHaveURL(/\/student\/dashboard$/);
  });

  test("the box breathing exercise starts on Inhale and moves on to Hold", async ({ page }) => {
    await page.goto("/resources");
    const exercise = page.getByRole("region", { name: "Box breathing exercise" });
    const announcement = exercise.getByRole("status");

    await exercise.getByRole("button", { name: "Start breathing exercise" }).click();
    await expect(announcement).toHaveText("Inhale");
    await expect(exercise.getByRole("button", { name: "Stop" })).toBeVisible();

    // Each phase lasts 4 seconds.
    await expect(announcement).toHaveText("Hold", { timeout: 6_000 });
  });

  test("stopping the breathing exercise resets it so it can be started again", async ({ page }) => {
    await page.goto("/resources");
    const exercise = page.getByRole("region", { name: "Box breathing exercise" });

    await exercise.getByRole("button", { name: "Start breathing exercise" }).click();
    await exercise.getByRole("button", { name: "Stop" }).click();

    await expect(exercise.getByRole("status")).toHaveText("Breathing exercise stopped.");
    await expect(exercise.getByRole("button", { name: "Start breathing exercise" })).toBeVisible();
  });
});

test.describe("Crisis resources access", () => {
  test("visitors who are not logged in are asked to log in first", async ({ page }) => {
    await seed(page);

    await page.goto("/resources");

    await expect(page).toHaveURL(/\/login$/);
  });
});

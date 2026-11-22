import { test, expect } from "@playwright/test";
import { seed, logIn, completeCheckIn, STUDENT } from "./helpers";

test.describe("Student onboarding", () => {
  test("a first-time student is walked through three steps and lands on the check-in", async ({ page }) => {
    await seed(page, { tour: true });
    await logIn(page, STUDENT);

    const tour = page.getByRole("dialog");
    await expect(tour.getByRole("heading", { name: "Welcome to Mind Bridge" })).toBeVisible();
    await tour.getByRole("button", { name: "Next" }).click();
    await expect(tour.getByRole("heading", { name: "Your check-in is confidential" })).toBeVisible();
    await tour.getByRole("button", { name: "Next" }).click();
    await expect(tour.getByText("1553")).toBeVisible();
    await tour.getByRole("button", { name: "Start my first check-in" }).click();

    await expect(tour).toBeHidden();
    await expect(page.getByRole("heading", { name: "Check-in", exact: true })).toBeInViewport();

    // Seen once: it does not return after a reload.
    await page.reload();
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("closing the tour also counts as seen", async ({ page }) => {
    await seed(page, { tour: true });
    await logIn(page, STUDENT);
    await page.getByRole("dialog").getByRole("button", { name: "Close dialog" }).click();
    await page.reload();
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("a student with no check-ins sees a three-step guide, and the extras start folded away", async ({ page }) => {
    await seed(page);
    await logIn(page, STUDENT);

    const guide = page.getByRole("region", { name: "Where to begin" });
    await expect(guide.getByRole("listitem")).toHaveCount(3);
    // Only the check-in is open; everything else is a one-line heading until chosen.
    await expect(page.getByRole("heading", { name: "Check-in", exact: true })).toBeVisible();
    await expect(page.locator("details[open]")).toHaveCount(0);
    await expect(page.getByText("Four pillars of wellness")).toBeVisible();

    // The guide can open a folded section, and can be hidden for good.
    await guide.getByRole("button", { name: /Open Take a calm moment/ }).click();
    await expect(page.locator("details#more-relax")).toHaveAttribute("open", "");
    await guide.getByRole("button", { name: "Hide this guide" }).click();
    await page.reload();
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
    await expect(page.getByRole("region", { name: "Where to begin" })).toHaveCount(0);
  });

  test("the guide is gone once the student has a check-in", async ({ page }) => {
    await seed(page);
    await logIn(page, STUDENT);
    await completeCheckIn(page, [0, 0, 0, 0, 0, 0, 0]);
    await page.reload();
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
    await expect(page.getByRole("region", { name: "Where to begin" })).toHaveCount(0);
  });
});

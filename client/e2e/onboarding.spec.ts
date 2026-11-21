import { test, expect } from "@playwright/test";
import { seed, logIn, STUDENT } from "./helpers";

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
});

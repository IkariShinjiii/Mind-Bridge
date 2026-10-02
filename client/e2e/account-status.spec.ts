import { test, expect } from "@playwright/test";
import { seed, logIn, COUNSELOR, STUDENT } from "./helpers";

const unapprovedCounselor = {
  name: COUNSELOR.name,
  email: COUNSELOR.email,
  role: "counselor",
  approved: false,
  active: true,
  emailVerified: true,
};

test.describe("A counselor who is not approved yet", () => {
  test.beforeEach(async ({ page }) => {
    await seed(page, { docs: { users: { [COUNSELOR.uid]: unapprovedCounselor } } });
    await logIn(page, COUNSELOR);
  });

  test("sees why they cannot get in, not a dashboard full of errors", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Your staff account is waiting for approval" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Staff dashboard" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Inspect case" })).toHaveCount(0);
    await expect(page).toHaveTitle(/Staff dashboard/);
  });

  test("can check again, is told nothing changed, and can log out", async ({ page }) => {
    await page.getByRole("button", { name: "Check again" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Still waiting" })).toBeVisible();

    await page.getByRole("button", { name: "Log out" }).first().click();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test("a counselor who has been approved goes straight to the dashboard", async ({ page }) => {
  await seed(page);
  await logIn(page, COUNSELOR);
  await expect(page.getByRole("heading", { name: "Staff dashboard" })).toBeVisible();
  await expect(page.getByText("waiting for approval")).toHaveCount(0);
});

test("students are never held for approval", async ({ page }) => {
  await seed(page, {
    docs: { users: { [STUDENT.uid]: { name: STUDENT.name, email: STUDENT.email, role: "student", active: true } } },
  });
  await logIn(page, STUDENT);
  await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
});

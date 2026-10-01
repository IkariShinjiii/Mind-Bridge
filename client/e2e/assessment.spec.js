import { test, expect } from "@playwright/test";
import { seed, readCollection, logIn, completeCheckIn, STUDENT } from "./helpers.js";

test.describe("Completing a wellness check-in", () => {
  test.beforeEach(async ({ page }) => {
    await seed(page);
    await logIn(page, STUDENT);
    await expect(page).toHaveURL(/\/student\/dashboard$/);
  });

  test("the check-in starts on question 1 of 7 and cannot go back or skip ahead without an answer", async ({ page }) => {
    const checkIn = page.getByRole("region", { name: "Check-in" });

    await expect(checkIn.getByText("You are on question 1 of 7")).toBeVisible();
    await expect(checkIn.getByRole("button", { name: "Back" })).toBeDisabled();
    await expect(checkIn.getByRole("button", { name: /^Next/ })).toBeDisabled();

    await checkIn.getByText("Several days").click();

    await expect(checkIn.getByRole("button", { name: /^Next/ })).toBeEnabled();
  });

  test("going back keeps the answer that was already given", async ({ page }) => {
    const checkIn = page.getByRole("region", { name: "Check-in" });

    await checkIn.locator('input[type=radio][value="2"]').check({ force: true });
    await checkIn.getByRole("button", { name: /^Next/ }).click();
    await expect(checkIn.getByText("You are on question 2 of 7")).toBeVisible();

    await checkIn.getByRole("button", { name: "Back" }).click();

    await expect(checkIn.getByText("You are on question 1 of 7")).toBeVisible();
    await expect(checkIn.locator('input[type=radio][value="2"]')).toBeChecked();
  });

  test("the last question offers Submit check-in instead of Next", async ({ page }) => {
    const checkIn = page.getByRole("region", { name: "Check-in" });
    for (let i = 0; i < 6; i++) {
      await checkIn.locator('input[type=radio][value="0"]').check({ force: true });
      await checkIn.getByRole("button", { name: /^Next/ }).click();
    }

    await expect(checkIn.getByText("You are on question 7 of 7")).toBeVisible();
    await expect(checkIn.getByRole("button", { name: "Submit check-in" })).toBeDisabled();
    await expect(checkIn.getByText(/This question is about your safety/)).toBeVisible();
  });

  test("a low-scoring check-in is saved for the signed-in student as low risk", async ({ page }) => {
    await completeCheckIn(page, [0, 0, 1, 0, 0, 0, 0]);

    await expect(page.getByRole("heading", { name: "Check-in complete. You're doing well." })).toBeVisible();

    const [saved, ...rest] = await readCollection(page, "assessments");
    expect(rest).toHaveLength(0);
    expect(saved).toMatchObject({
      studentId: STUDENT.uid,
      studentEmail: STUDENT.email,
      total: 1,
      maxScore: 21,
      riskLevel: "low",
      flaggedForImmediateReview: false,
      status: "open",
    });
    expect(saved.answers).toEqual([0, 0, 1, 0, 0, 0, 0]);
    expect(saved.questionSummary).toHaveLength(7);
  });

  test("a check-in with a safety answer above zero is flagged for immediate review and shows crisis hotlines", async ({ page }) => {
    await completeCheckIn(page, [0, 0, 0, 0, 0, 0, 1]);

    await expect(page.getByText("Priority support suggested")).toBeVisible();
    await expect(page.getByRole("heading", { name: "You don't have to carry this alone." })).toBeVisible();
    await expect(page.getByText("If you need to talk to someone right now")).toBeVisible();
    await expect(page.getByRole("link", { name: "0917-899-8727" })).toHaveAttribute("href", "tel:+639178998727");

    const [saved] = await readCollection(page, "assessments");
    expect(saved).toMatchObject({ riskLevel: "high", flaggedForImmediateReview: true, total: 1 });
    expect(saved.questionSummary[6]).toMatchObject({ isCrisisItem: true, score: 1 });
  });

  test("a student can start the check-in again after finishing one", async ({ page }) => {
    await completeCheckIn(page, [0, 0, 0, 0, 0, 0, 0]);
    await page.getByRole("button", { name: "Take the check-in again" }).click();

    const checkIn = page.getByRole("region", { name: "Check-in" });
    await expect(checkIn.getByText("You are on question 1 of 7")).toBeVisible();
    await expect(checkIn.locator('input[type=radio]:checked')).toHaveCount(0);
  });
});

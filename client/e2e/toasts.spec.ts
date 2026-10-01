import { test, expect } from "@playwright/test";
import { seed, logIn, STUDENT, COUNSELOR } from "./helpers";

const openCase = {
  studentId: STUDENT.uid,
  studentName: STUDENT.name,
  studentEmail: STUDENT.email,
  answers: [1, 1, 1, 1, 1, 1, 2],
  questionSummary: [],
  total: 8,
  maxScore: 21,
  riskLevel: "high",
  flaggedForImmediateReview: true,
  status: "open",
  counselorNotes: "",
  createdAt: "2026-09-20T10:00:00.000Z",
};

test.describe("Toast notifications", () => {
  test("a successful action shows a polite status toast that can be dismissed", async ({ page }) => {
    await seed(page, { docs: { assessments: { c1: openCase } } });
    await logIn(page, COUNSELOR);

    await page.getByRole("button", { name: "Mark reviewed" }).click();

    const toast = page.getByRole("status").filter({ hasText: "Case marked reviewed." });
    await expect(toast).toBeVisible();
    await toast.getByRole("button", { name: /Dismiss/ }).click();
    await expect(toast).toHaveCount(0);
  });

  test("saving a profile confirms with a toast on the settings page", async ({ page }) => {
    await seed(page);
    await logIn(page, STUDENT);
    await page.goto("/settings");

    await page.getByRole("button", { name: /Save/ }).first().click();

    await expect(page.getByRole("status").filter({ hasText: "Profile saved." })).toBeVisible();
  });

  test("a failing action shows an assertive error toast that stays until read", async ({ page }) => {
    await seed(page, { docs: { assessments: { c1: openCase } } });
    await logIn(page, COUNSELOR);
    await expect(page.getByRole("button", { name: "Mark reviewed" })).toBeVisible();
    // Break the write path: the next status update targets a case that no longer exists.
    await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem("mb_e2e_state") ?? "{}") as {
        docs: { assessments: Record<string, unknown> };
      };
      delete state.docs.assessments["c1"];
      localStorage.setItem("mb_e2e_state", JSON.stringify(state));
    });

    await page.getByRole("button", { name: "Mark reviewed" }).click();

    const alert = page.getByRole("alert").filter({ hasText: "Could not update the case status" });
    await expect(alert).toBeVisible();
    await page.waitForTimeout(6000); // still there after a success toast would have gone
    await expect(alert).toBeVisible();
  });

  test("hovering a toast keeps it open past its normal time", async ({ page }) => {
    await seed(page, { docs: { assessments: { c1: openCase } } });
    await logIn(page, COUNSELOR);
    await page.getByRole("button", { name: "Mark reviewed" }).click();
    const toast = page.getByRole("status").filter({ hasText: "Case marked reviewed." });
    await expect(toast).toBeVisible();

    await toast.hover();
    await page.waitForTimeout(5800);

    await expect(toast).toBeVisible();
  });
});

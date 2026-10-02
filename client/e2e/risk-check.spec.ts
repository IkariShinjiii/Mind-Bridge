import { test, expect } from "@playwright/test";
import { seed, logIn, STUDENT, COUNSELOR } from "./helpers";

// A check-in as the student's browser could have written it: crisis answer above zero and a high score,
// but filed as low risk with no safety flag.
const understated = {
  studentId: STUDENT.uid,
  studentName: STUDENT.name,
  studentEmail: STUDENT.email,
  answers: [3, 3, 3, 3, 3, 0, 2],
  questionSummary: [
    { id: "q1", text: "Little interest or pleasure", score: 3, isCrisisItem: false },
    { id: "q7", text: "Thoughts that you would be better off not around", score: 2, isCrisisItem: true },
  ],
  total: 17,
  maxScore: 21,
  riskLevel: "low",
  flaggedForImmediateReview: false,
  status: "open",
  counselorNotes: "",
  createdAt: "2026-09-20T10:00:00.000Z",
};

test.describe("Staff dashboard does not trust the saved risk level", () => {
  test.beforeEach(async ({ page }) => {
    await seed(page, { docs: { assessments: { c1: understated } } });
    await logIn(page, COUNSELOR);
  });

  test("a check-in saved as low but answered at crisis level is shown as high risk, flagged and explained", async ({
    page,
  }) => {
    // It lands in the default "Flagged / urgent" view, which a low-risk case would not.
    const card = page.getByRole("listitem").filter({ hasText: STUDENT.name });
    await expect(card).toBeVisible();
    await expect(card.getByText("high risk", { exact: false })).toBeVisible();
    await expect(card.getByText("Safety question flagged")).toBeVisible();
    await expect(card.getByText("Raised from the answers (saved as low)")).toBeVisible();
  });

  test("it is counted as high risk in the headline numbers and the analytics", async ({ page }) => {
    await expect(page.getByText("Need review first").locator("xpath=..")).toHaveText(
      /high risk\s*1\s*need review first/i,
    );

    await page.getByRole("button", { name: "Analytics" }).click();
    await expect(
      page
        .locator("div")
        .filter({ hasText: /^High risk\s*1\s*100% of check-ins$/ })
        .last(),
    ).toBeVisible();
    await expect(
      page
        .locator("div")
        .filter({ hasText: /^Low risk\s*0\s*0% of check-ins$/ })
        .last(),
    ).toBeVisible();
  });

  test("the inspector says so as well", async ({ page }) => {
    await page.getByRole("button", { name: "Inspect case" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Raised from the answers (saved as low)")).toBeVisible();
    await expect(dialog.getByText("High Risk", { exact: false }).first()).toBeVisible();
  });
});

test("an honest check-in shows no correction note", async ({ page }) => {
  await seed(page, {
    docs: { assessments: { c1: { ...understated, riskLevel: "high", flaggedForImmediateReview: true } } },
  });
  await logIn(page, COUNSELOR);
  await expect(page.getByRole("listitem").filter({ hasText: STUDENT.name })).toBeVisible();
  await expect(page.getByText("Raised from the answers")).toHaveCount(0);
});

import { test, expect } from "@playwright/test";
import { seed, logIn, completeCheckIn, STUDENT } from "./helpers";

const past = (id: string, createdAt: string, total: number, riskLevel: string): Record<string, Record<string, unknown>> => ({
  [id]: {
    studentId: STUDENT.uid, studentName: STUDENT.name, studentEmail: STUDENT.email,
    answers: [], questionSummary: [], total, maxScore: 21, riskLevel,
    flaggedForImmediateReview: false, status: "open", counselorNotes: "", createdAt,
  },
});

test.describe("Viewing assessment results", () => {
  test("a student with no check-ins sees an empty state instead of a score", async ({ page }) => {
    await seed(page);
    await logIn(page, STUDENT);

    await expect(page.getByText("Latest Wellness Index").locator("..")).toContainText("No check-in");
    await expect(page.getByText("No check-ins yet")).toBeVisible();
    await expect(page.getByRole("group", { name: "Trend view" })).toHaveCount(0);
  });

  test("right after submitting, the wellness index card shows the new score and risk label", async ({ page }) => {
    await seed(page);
    await logIn(page, STUDENT);

    await completeCheckIn(page, [2, 1, 1, 1, 1, 1, 0]); // 7 of 21 is the medium band

    await expect(page.getByRole("heading", { name: "Thank you for checking in. Take some time to breathe." })).toBeVisible();
    await expect(page.getByText("7 / 21", { exact: true })).toBeVisible();
    await expect(page.getByText("Elevated Stress", { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: /Line chart of 1 check-in scores, latest 7 out of 21/ })).toBeVisible();
  });

  test("previous check-ins load on login and the latest score is shown", async ({ page }) => {
    await seed(page, {
      docs: { assessments: { ...past("a1", "2026-09-01T09:00:00.000Z", 12, "medium") } },
    });
    await logIn(page, STUDENT);

    await expect(page.getByText("12 / 21")).toBeVisible();
    await expect(page.getByRole("img", { name: /Line chart of 1 check-in scores, latest 12 out of 21/ })).toBeVisible();
  });

  test("only the signed-in student's own check-ins appear in their results", async ({ page }) => {
    await seed(page, {
      docs: {
        assessments: {
          ...past("mine", "2026-09-01T09:00:00.000Z", 4, "low"),
          other: { ...past("x", "2026-09-02T09:00:00.000Z", 19, "high")["x"], studentId: "uid-someone-else" },
        },
      },
    });
    await logIn(page, STUDENT);

    await expect(page.getByText("4 / 21")).toBeVisible();
    await expect(page.getByRole("img", { name: /Line chart of 1 check-in scores/ })).toBeVisible();
    await expect(page.getByText("19 / 21")).toHaveCount(0);
  });

  test("a second, lower score is reported as an improvement over the previous check-in", async ({ page }) => {
    await seed(page, {
      docs: { assessments: { ...past("a1", "2026-09-01T09:00:00.000Z", 10, "medium") } },
    });
    await logIn(page, STUDENT);

    await completeCheckIn(page, [1, 0, 0, 0, 0, 0, 0]);

    await expect(page.getByText("9 pts lower than previous check-in (Improving)")).toBeVisible();
    await expect(page.getByRole("img", { name: /Line chart of 2 check-in scores, latest 1 out of 21/ })).toBeVisible();
  });

  test("the History view lists past check-ins with their scores and risk levels", async ({ page }) => {
    await seed(page, {
      docs: {
        assessments: {
          ...past("a1", "2026-09-01T09:00:00.000Z", 3, "low"),
          ...past("a2", "2026-09-08T09:00:00.000Z", 14, "high"),
        },
      },
    });
    await logIn(page, STUDENT);

    const trend = page.getByRole("group", { name: "Trend view" });
    await trend.getByRole("button", { name: "History" }).click();

    await expect(trend.getByRole("button", { name: "History" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("low risk", { exact: true })).toBeVisible();
    await expect(page.getByText("high risk", { exact: true })).toBeVisible();
    await expect(page.getByText(/Score:/)).toHaveCount(2);

    await trend.getByRole("button", { name: "Chart" }).click();
    await expect(page.getByRole("img", { name: /Line chart of 2 check-in scores/ })).toBeVisible();
  });
});

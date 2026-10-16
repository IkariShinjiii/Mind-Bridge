import { test, expect } from "@playwright/test";
import { seed, logIn, STUDENT } from "./helpers";

const checkIn = (total: number, riskLevel: string, createdAt: string) => ({
  studentId: STUDENT.uid,
  studentName: STUDENT.name,
  studentEmail: STUDENT.email,
  answers: [],
  questionSummary: [],
  total,
  maxScore: 21,
  riskLevel,
  flaggedForImmediateReview: false,
  status: "open",
  counselorNotes: "",
  createdAt,
});

test("the dashboard treats the newest check-in as the latest, and the trend card compares it with the one before", async ({
  page,
}) => {
  // Stored oldest first: a list read as "first is latest" would pick the 4.
  const now = Date.now();
  const days = (n: number) => new Date(now - n * 86_400_000).toISOString();
  await seed(page, {
    docs: {
      assessments: {
        a1: checkIn(4, "low", days(20)),
        a2: checkIn(9, "medium", days(12)),
        a3: checkIn(14, "high", days(5)),
      },
    },
  });
  await logIn(page, STUDENT);
  await page.goto("/student/dashboard");

  await expect(page.getByText("14 / 21")).toBeVisible();

  const trend = page.locator(".mb-card").filter({ has: page.getByRole("heading", { name: "My wellness trend" }) });
  await expect(trend.getByText("14 of 21", { exact: true })).toBeVisible();
  await expect(trend.getByText("5 days ago")).toBeVisible();
  await expect(trend.getByText("5 points higher than your last check-in")).toBeVisible();

  await trend.getByRole("button", { name: "History" }).click();
  await expect(trend.getByText("Score: 14 / 21")).toBeVisible();
});

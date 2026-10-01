import { test, expect } from "@playwright/test";
import { seed, readCollection, logIn, signOut, completeCheckIn, STUDENT, COUNSELOR } from "./helpers.js";

const questionSummary = [
  "Little interest or pleasure in doing academic or daily activities",
  "Feeling down, depressed, overwhelmed, or hopeless",
  "Trouble falling or staying asleep, or sleeping excessively",
  "Feeling nervous, anxious, or constantly on edge",
  "Not being able to stop or control worrying",
  "Trouble concentrating on lectures, schoolwork, or reading",
  "Thoughts that you would be better off not around, or hurting yourself in some way",
].map((text, i) => ({ id: `q${i + 1}`, text, score: i === 6 ? 2 : 1, isCrisisItem: i === 6 }));

const flaggedCase = {
  studentId: STUDENT.uid, studentName: STUDENT.name, studentEmail: STUDENT.email,
  answers: [1, 1, 1, 1, 1, 1, 2], questionSummary, total: 8, maxScore: 21, riskLevel: "high",
  flaggedForImmediateReview: true, status: "open", counselorNotes: "", createdAt: "2026-09-20T10:00:00.000Z",
};

const lowCase = {
  ...flaggedCase, studentId: "uid-other", studentName: "Carlo Other", studentEmail: "carlo@usa.edu.ph",
  total: 2, riskLevel: "low", flaggedForImmediateReview: false, createdAt: "2026-09-19T10:00:00.000Z",
};

test.describe("Counselor accessing student data", () => {
  test("a check-in submitted by a student shows up for the counselor with the student's details", async ({ page }) => {
    await seed(page);

    await logIn(page, STUDENT);
    await completeCheckIn(page, [1, 1, 1, 1, 1, 1, 2]);
    await expect(page.getByText("Priority support suggested")).toBeVisible();
    await signOut(page);

    await logIn(page, COUNSELOR);
    await expect(page).toHaveURL(/\/admin\/dashboard$/);

    const cases = page.getByRole("listitem").filter({ hasText: STUDENT.email });
    await expect(cases).toHaveCount(1);
    await expect(cases).toContainText(STUDENT.name);
    await expect(cases).toContainText("high risk");
    await expect(cases).toContainText("Safety question flagged");
  });

  test.describe("with existing cases", () => {
    test.beforeEach(async ({ page }) => {
      await seed(page, {
        docs: {
          assessments: { c1: flaggedCase, c2: lowCase },
          users: {
            [STUDENT.uid]: {
              name: STUDENT.name, email: STUDENT.email, role: "student", approved: true, active: true,
              emergencyContact: {
                name: "Maria Student", relationship: "Mother", phone: "0917-111-2222", alternatePhone: "", notes: "Call after 5pm",
              },
            },
          },
        },
      });
      await logIn(page, COUNSELOR);
      await expect(page.getByRole("heading", { name: "Staff dashboard" })).toBeVisible();
    });

    test("the default view lists only flagged or urgent cases", async ({ page }) => {
      await expect(page.getByText("1 case, highest priority first")).toBeVisible();
      await expect(page.getByText(STUDENT.name)).toBeVisible();
      await expect(page.getByText("Carlo Other")).toHaveCount(0);
    });

    test("filtering by All also shows low-risk students", async ({ page }) => {
      await page.getByRole("group", { name: "Filter cases" }).getByRole("button", { name: "All", exact: true }).click();

      await expect(page.getByText("2 cases, highest priority first")).toBeVisible();
      await expect(page.getByText("Carlo Other")).toBeVisible();
    });

    test("inspecting a case reveals the student's answers, safety flag and emergency contact", async ({ page }) => {
      await page.getByRole("button", { name: "Inspect case" }).click();

      const dialog = page.getByRole("dialog", { name: STUDENT.name });
      await expect(dialog).toContainText(STUDENT.email);
      await expect(dialog.getByRole("heading", { name: "Screening responses" })).toBeVisible();
      await expect(dialog.getByRole("listitem")).toHaveCount(7);
      await expect(dialog).toContainText("Thoughts that you would be better off not around");
      await expect(dialog.getByText("Safety question", { exact: true })).toBeVisible();

      await expect(dialog.getByText("Maria Student")).toBeVisible();
      await expect(dialog.getByText("Mother")).toBeVisible();
      await expect(dialog.getByRole("link", { name: "0917-111-2222" })).toBeVisible();
      await expect(dialog.getByText("Call after 5pm")).toBeVisible();
    });

    test("a counselor can save confidential case notes and change the case status", async ({ page }) => {
      await page.getByRole("button", { name: "Inspect case" }).click();
      const dialog = page.getByRole("dialog", { name: STUDENT.name });

      await dialog.getByRole("textbox", { name: "Case notes" }).fill("Called student, booked a session for Friday.");
      await dialog.getByRole("button", { name: "escalated" }).click();
      await expect(dialog.getByRole("button", { name: "escalated" })).toHaveAttribute("aria-pressed", "true");
      await dialog.getByRole("button", { name: "Save notes" }).click();
      await expect(page.getByText("Case notes saved.")).toBeVisible();

      const saved = (await readCollection(page, "assessments")).find((a) => a.id === "c1");
      expect(saved).toMatchObject({
        counselorNotes: "Called student, booked a session for Friday.",
        status: "escalated",
      });
    });

    test("marking a case reviewed updates its status and the Reviewed filter lists it", async ({ page }) => {
      await page.getByRole("button", { name: "Mark reviewed" }).click();
      await expect(page.getByText("Case marked reviewed.")).toBeVisible();

      await page.getByRole("group", { name: "Filter cases" }).getByRole("button", { name: "Reviewed" }).click();

      const reviewed = page.getByRole("listitem").filter({ hasText: STUDENT.email });
      await expect(reviewed).toContainText("reviewed");
      await expect(reviewed.getByRole("button", { name: "Re-open" })).toBeVisible();
    });

    test("the Accounts section lists registered students so staff can manage assignments", async ({ page }) => {
      await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Accounts and assignments" }).click();

      await expect(page).toHaveURL(/tab=accounts/);
      await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();
    });
  });

  test.describe("access control", () => {
    test("a student who opens the staff dashboard is sent back to the student dashboard", async ({ page }) => {
      await seed(page, { docs: { assessments: { c1: flaggedCase } } });
      await logIn(page, STUDENT);
      await expect(page).toHaveURL(/\/student\/dashboard$/);

      await page.goto("/admin/dashboard");

      await expect(page).toHaveURL(/\/student\/dashboard$/);
      await expect(page.getByRole("heading", { name: "Staff dashboard" })).toHaveCount(0);
    });

    test("a counselor who opens the student dashboard is sent to the staff dashboard", async ({ page }) => {
      await seed(page);
      await logIn(page, COUNSELOR);
      await expect(page).toHaveURL(/\/admin\/dashboard$/);

      await page.goto("/student/dashboard");

      await expect(page).toHaveURL(/\/admin\/dashboard$/);
    });
  });
});

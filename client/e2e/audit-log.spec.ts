import { test, expect } from "@playwright/test";
import { seed, readCollection, logIn, signOut, STUDENT, PEER_FACILITATOR, type TestPerson } from "./helpers";

const ADMIN: TestPerson = { uid: "uid-admin", name: "Admin Lopez", email: "lopez@usa.edu.ph", password: "Admin#12345" };

const flaggedCase = {
  studentId: STUDENT.uid,
  studentName: STUDENT.name,
  studentEmail: STUDENT.email,
  answers: [1, 1, 1, 1, 1, 1, 2],
  questionSummary: [
    "Little interest or pleasure in doing academic or daily activities",
    "Feeling down, depressed, overwhelmed, or hopeless",
    "Trouble falling or staying asleep, or sleeping excessively",
    "Feeling nervous, anxious, or constantly on edge",
    "Not being able to stop or control worrying",
    "Trouble concentrating on lectures, schoolwork, or reading",
    "Thoughts that you would be better off not around, or hurting yourself in some way",
  ].map((text, i) => ({ id: `q${i + 1}`, text, score: i === 6 ? 2 : 1, isCrisisItem: i === 6 })),
  total: 8,
  maxScore: 21,
  riskLevel: "high",
  flaggedForImmediateReview: true,
  status: "open",
  counselorNotes: "",
  createdAt: "2026-09-20T10:00:00.000Z",
};

test("viewing and updating a case is recorded, and an admin can read it in the reports", async ({ page }) => {
  await seed(page, {
    accounts: [ADMIN],
    docs: {
      assessments: { c1: flaggedCase },
      users: { [ADMIN.uid]: { name: ADMIN.name, email: ADMIN.email, role: "admin", approved: true, active: true } },
    },
  });

  await logIn(page, PEER_FACILITATOR);
  await page.getByRole("button", { name: "Inspect case" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Case notes" }).fill("Called the student.");
  await dialog.getByRole("button", { name: "Save notes" }).click();
  await expect(page.getByText("Case notes saved.")).toBeVisible();

  const log = await readCollection(page, "auditLog");
  expect(log.map((e) => e["action"]).sort()).toEqual(["case_updated", "case_viewed"]);
  expect(log.every((e) => e["actorId"] === PEER_FACILITATOR.uid)).toBe(true);
  await dialog.getByRole("button", { name: "Close dialog" }).click();
  await signOut(page);

  await logIn(page, ADMIN);
  await page.goto("/admin/dashboard?tab=analytics");
  const audit = page.getByRole("region", { name: "Audit log" });
  await expect(audit.getByRole("cell", { name: PEER_FACILITATOR.name })).toHaveCount(2);
  await expect(audit).toContainText("Viewed case");
  await expect(audit).toContainText("Updated case");
});

test("a peer facilitator does not see the audit log", async ({ page }) => {
  await seed(page);
  await logIn(page, PEER_FACILITATOR);
  await page.goto("/admin/dashboard?tab=analytics");
  await expect(page.getByRole("heading", { name: "Export report" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Audit log" })).toHaveCount(0);
});

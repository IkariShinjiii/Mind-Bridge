import { test, expect } from "@playwright/test";
import { seed, logIn, STUDENT, COUNSELOR } from "./helpers";

const checkIn = {
  studentId: STUDENT.uid,
  studentName: STUDENT.name,
  studentEmail: STUDENT.email,
  answers: [1, 1, 1, 0, 0, 1, 0],
  questionSummary: [{ id: "q1", text: "Little interest or pleasure", score: 1, isCrisisItem: false }],
  total: 4,
  maxScore: 21,
  riskLevel: "medium",
  flaggedForImmediateReview: false,
  status: "reviewed",
  counselorNotes: "CONFIDENTIAL staff note about the student",
  createdAt: "2026-09-20T10:00:00.000Z",
};

const appointment = {
  studentId: STUDENT.uid,
  studentName: STUDENT.name,
  studentEmail: STUDENT.email,
  title: "Session with Dr. Reyes",
  status: "Confirmed",
  counselorNote: "CONFIDENTIAL appointment note",
  createdAt: "2026-09-21T10:00:00.000Z",
};

const messages = {
  m1: {
    studentId: STUDENT.uid,
    senderId: COUNSELOR.uid,
    senderName: "Dr. Reyes",
    senderRole: "admin",
    text: "See you on Friday",
    timestamp: "2026-09-22T09:00:00.000Z",
  },
  other: {
    studentId: "uid-someone-else",
    senderId: "uid-someone-else",
    senderName: "Another Student",
    senderRole: "student",
    text: "PRIVATE thread of another student",
    timestamp: "2026-09-22T09:05:00.000Z",
  },
};

test.describe("Download my data", () => {
  test.beforeEach(async ({ page }) => {
    await seed(page, { docs: { assessments: { a1: checkIn }, appointments: { p1: appointment }, messages } });
    await logIn(page, STUDENT);
    await page.goto("/settings");
    await page.getByRole("button", { name: "Privacy", exact: true }).click();
  });

  test("gives the student their own data as a JSON file, without staff notes or anyone else's data", async ({
    page,
  }) => {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download my data" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^mind-bridge-my-data-\d{4}-\d{2}-\d{2}\.json$/);
    const path = await download.path();
    const text = (await import("node:fs")).readFileSync(path, "utf8");
    const file = JSON.parse(text);

    expect(file.profile).toMatchObject({ name: STUDENT.name, email: STUDENT.email });
    expect(file.checkIns).toHaveLength(1);
    expect(file.checkIns[0]).toMatchObject({ total: 4, riskLevel: "medium", status: "reviewed" });
    expect(file.appointments[0]).toMatchObject({ title: "Session with Dr. Reyes" });
    expect(file.messages).toHaveLength(1);
    expect(file.messages[0]).toMatchObject({ text: "See you on Friday" });

    expect(text).not.toContain("CONFIDENTIAL");
    expect(text).not.toContain("PRIVATE thread");
    expect(file.notIncluded).toMatch(/Notes written by guidance staff are not included/);

    await expect(page.getByRole("status").filter({ hasText: "Your data was downloaded." })).toBeVisible();
  });

  test("the section explains what is and is not in the file", async ({ page }) => {
    const section = page.getByRole("region", { name: "Your data" });
    await expect(section).toContainText("profile, check-ins, appointments and chat messages");
    await expect(section).toContainText("Notes written by guidance staff are not included");
  });
});

test("staff can download their own data too", async ({ page }) => {
  await seed(page, { docs: { messages } });
  await logIn(page, COUNSELOR);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Privacy", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download my data" }).click();
  const download = await downloadPromise;
  const file = JSON.parse((await import("node:fs")).readFileSync((await download.path())!, "utf8"));
  expect(file.profile).toMatchObject({ email: COUNSELOR.email });
  expect(file.checkIns).toEqual([]);
  expect(file.messages).toEqual([]);
});

import { test, expect } from "@playwright/test";
import { seed, readCollection, logIn, COUNSELOR } from "./helpers";

const questionSummary = [
  "Little interest or pleasure in doing academic or daily activities",
  "Feeling down, depressed, overwhelmed, or hopeless",
  "Trouble falling or staying asleep, or sleeping excessively",
  "Feeling nervous, anxious, or constantly on edge",
  "Not being able to stop or control worrying",
  "Trouble concentrating on lectures, schoolwork, or reading",
  "Thoughts that you would be better off not around, or hurting yourself in some way",
].map((text, i) => ({ id: `q${i + 1}`, text, score: i === 6 ? 2 : 1, isCrisisItem: i === 6 }));

const highCase = (name: string, over: Record<string, unknown> = {}) => ({
  studentId: `uid-${name}`,
  studentName: name,
  studentEmail: `${name.toLowerCase()}@usa.edu.ph`,
  answers: [1, 1, 1, 1, 1, 1, 2],
  questionSummary,
  total: 8,
  maxScore: 21,
  riskLevel: "high",
  flaggedForImmediateReview: true,
  status: "open",
  counselorNotes: "",
  createdAt: "2026-09-20T10:00:00.000Z",
  ...over,
});

/** A "YYYY-MM-DD" day in the browser's local time zone, `days` from today (the page uses the same clock). */
const day = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const cases = {
  overdue: highCase("Olive", { followUpDate: day(-3) }),
  today: highCase("Tess", { followUpDate: day(0) }),
  later: highCase("Lena", { followUpDate: day(5) }),
  plain: highCase("Nora"),
  // Closed out, so its old date no longer matters
  done: highCase("Rina", { status: "reviewed", reviewedAt: "2026-09-21T10:00:00.000Z", followUpDate: day(-10) }),
};

test.describe("case follow-up dates", () => {
  test.beforeEach(async ({ page }) => {
    await seed(page, { docs: { assessments: cases } });
    await logIn(page, COUNSELOR);
    await expect(page.getByRole("heading", { name: "Staff dashboard" })).toBeVisible();
    await page.getByRole("group", { name: "Filter cases" }).getByRole("button", { name: "All", exact: true }).click();
  });

  const card = (page: import("@playwright/test").Page, name: string) =>
    page.getByRole("listitem").filter({ hasText: `${name.toLowerCase()}@usa.edu.ph` });

  test("the queue says which follow-ups are overdue, due today or coming, and puts overdue ones first", async ({ page }) => {
    await expect(card(page, "Olive")).toContainText("Follow-up overdue since");
    await expect(card(page, "Tess")).toContainText("Follow up today");
    await expect(card(page, "Lena")).toContainText(/Follow up [A-Z][a-z]{2} \d/);
    await expect(card(page, "Nora")).not.toContainText("Follow");
    await expect(card(page, "Rina")).not.toContainText("Follow");

    // Same risk level for all: the overdue one comes before the rest.
    const firstCard = page.getByRole("listitem").filter({ hasText: "@usa.edu.ph" }).first();
    await expect(firstCard).toContainText("Olive");
  });

  test("the Follow-up due filter lists only overdue and due-today cases", async ({ page }) => {
    await page.getByRole("group", { name: "Filter cases" }).getByRole("button", { name: "Follow-up due" }).click();
    await expect(page.getByText("2 cases, highest priority first")).toBeVisible();
    await expect(card(page, "Olive")).toBeVisible();
    await expect(card(page, "Tess")).toBeVisible();
    await expect(card(page, "Lena")).toHaveCount(0);
  });

  test("a counselor sets a follow-up date in the case view, and can clear it again", async ({ page }) => {
    await card(page, "Nora").getByRole("button", { name: "Inspect case" }).click();
    const dialog = page.getByRole("dialog", { name: "Nora" });

    await dialog.getByLabel("Follow-up date").fill(day(-1));
    await dialog.getByRole("button", { name: "Save notes" }).click();
    await expect(page.getByText("Case notes saved.")).toBeVisible();

    const stored = async () => (await readCollection(page, "assessments")).find((a) => a.studentName === "Nora");
    expect(await stored()).toMatchObject({ followUpDate: day(-1) });
    await expect(card(page, "Nora")).toContainText("Follow-up overdue since");

    await dialog.getByRole("button", { name: "Clear date" }).click();
    await expect(dialog.getByLabel("Follow-up date")).toHaveValue("");
    await dialog.getByRole("button", { name: "Save notes" }).click();
    await expect.poll(async () => (await stored())?.followUpDate).toBe("");
    await expect(card(page, "Nora")).not.toContainText("Follow");
  });

  test("saving notes without touching the date does not send the date", async ({ page }) => {
    await card(page, "Nora").getByRole("button", { name: "Inspect case" }).click();
    const dialog = page.getByRole("dialog", { name: "Nora" });
    await dialog.getByRole("textbox", { name: "Case notes" }).fill("Checked in by phone.");
    await dialog.getByRole("button", { name: "Save notes" }).click();
    await expect(page.getByText("Case notes saved.")).toBeVisible();

    const saved = (await readCollection(page, "assessments")).find((a) => a.studentName === "Nora");
    expect(saved).toMatchObject({ counselorNotes: "Checked in by phone." });
    expect(saved).not.toHaveProperty("followUpDate");
  });

  test("marking an overdue case reviewed clears its overdue badge", async ({ page }) => {
    await card(page, "Olive").getByRole("button", { name: "Mark reviewed" }).click();
    await expect(page.getByText("Case marked reviewed.")).toBeVisible();
    await expect(card(page, "Olive")).not.toContainText("Follow-up overdue");
  });
});

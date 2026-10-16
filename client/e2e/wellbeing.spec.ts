import { test, expect } from "@playwright/test";
import { seed, readCollection, logIn, STUDENT, COUNSELOR } from "./helpers";

async function answerAll(page: import("@playwright/test").Page, label: string) {
  const card = page.getByRole("region", { name: "Wellbeing" });
  await card.getByRole("button", { name: /Answer/ }).click();
  for (const fieldset of await card.locator("fieldset").all()) {
    await fieldset.getByText(label, { exact: true }).click();
  }
  await card.getByRole("button", { name: "Save my wellbeing score" }).click();
  return card;
}

test.describe("WHO-5 wellbeing", () => {
  test("a student answers the five statements and sees a score out of 100, saved without touching the check-in", async ({
    page,
  }) => {
    await seed(page);
    await logIn(page, STUDENT);
    const card = await answerAll(page, "More than half of the time"); // 3 each: raw 15, score 60

    await expect(card.getByText("60", { exact: false }).first()).toBeVisible();
    await expect(card.getByText("fairly good")).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "wellbeing score was saved" })).toBeVisible();

    const [saved] = await readCollection(page, "wellbeing");
    expect(saved).toMatchObject({ studentId: STUDENT.uid, answers: [3, 3, 3, 3, 3], score: 60 });
    expect(await readCollection(page, "assessments")).toHaveLength(0);
  });

  test("a low score says so gently and offers a counselor, without calling it a diagnosis", async ({ page }) => {
    await seed(page);
    await logIn(page, STUDENT);
    const card = await answerAll(page, "Some of the time"); // 1 each: score 20
    await expect(card.getByText(/under 50 suggests things have felt low/)).toBeVisible();
    await expect(card.getByRole("link", { name: "Book a counselor" })).toBeVisible();
  });

  test("it will not save until every statement is answered", async ({ page }) => {
    await seed(page);
    await logIn(page, STUDENT);
    const card = page.getByRole("region", { name: "Wellbeing" });
    await card.getByRole("button", { name: /Answer/ }).click();
    await card.getByRole("button", { name: "Save my wellbeing score" }).click();
    await expect(card.getByRole("alert")).toBeVisible();
    expect(await readCollection(page, "wellbeing")).toHaveLength(0);
  });

  test("a counselor sees the student's latest score in the case view", async ({ page }) => {
    await seed(page, {
      docs: {
        wellbeing: {
          w1: { studentId: STUDENT.uid, answers: [2, 2, 2, 2, 2], score: 40, createdAt: "2026-10-10T10:00:00.000Z" },
        },
        assessments: {
          c1: {
            studentId: STUDENT.uid,
            studentName: STUDENT.name,
            studentEmail: STUDENT.email,
            answers: [1, 1, 1, 1, 1, 1, 2],
            questionSummary: [1, 1, 1, 1, 1, 1, 2].map((score, i) => ({ id: `q${i + 1}`, text: `Q${i + 1}`, score, isCrisisItem: i === 6 })),
            total: 8,
            maxScore: 21,
            riskLevel: "high",
            flaggedForImmediateReview: true,
            status: "open",
            counselorNotes: "",
            createdAt: "2026-09-20T10:00:00.000Z",
          },
        },
      },
    });
    await logIn(page, COUNSELOR);
    await page.getByRole("button", { name: "Inspect case" }).click();
    const dialog = page.getByRole("dialog", { name: STUDENT.name });
    await expect(dialog).toContainText("Wellbeing (WHO-5) 40 of 100, low (under 50)");
    await expect(dialog).toContainText("does not change the risk level");
  });
});

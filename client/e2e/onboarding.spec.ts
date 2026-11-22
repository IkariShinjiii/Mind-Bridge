import { test, expect, type Page } from "@playwright/test";
import { seed, logIn, completeCheckIn, readCollection, STUDENT } from "./helpers";

const guide = (page: Page) => page.getByRole("region", { name: "Automated guide" });
// The greeting block: the heading's parent's parent, which also holds the header choices.
const header = (page: Page) => page.locator("h1").locator("..").locator("..");

test.describe("Automated welcome guide", () => {
  test("a first-time student is welcomed inline and can walk through to the check-in", async ({ page }) => {
    await seed(page, { tour: true });
    await logIn(page, STUDENT);

    await expect(page.getByRole("dialog")).toHaveCount(0); // never a pop-up over the crisis card
    await expect(guide(page)).toContainText("automated guide, not a person");
    await expect(guide(page)).toContainText("nothing you tap here is shared with staff");
    await guide(page).getByRole("button", { name: "Show me around" }).click();
    await guide(page).getByRole("button", { name: "Sleep" }).click();
    await guide(page).getByRole("button", { name: "Not now" }).click();
    await expect(guide(page)).toContainText("A check-in takes about a minute");
    await guide(page).getByRole("button", { name: "Start my check-in" }).click();

    await expect(guide(page)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Check-in", exact: true })).toBeInViewport();
  });

  test("goals are saved only when the student saves them", async ({ page }) => {
    await seed(page, { tour: true });
    await logIn(page, STUDENT);
    await guide(page).getByRole("button", { name: "Show me around" }).click();
    await guide(page).getByRole("button", { name: "School stress" }).click();
    await guide(page).getByRole("button", { name: "Improve sleep quality and habits" }).click();
    await guide(page).getByRole("button", { name: "Save these goals" }).click();
    await expect(guide(page)).toContainText("A check-in takes about a minute");
    const users = await readCollection(page, "users");
    expect(users.find((u) => u.id === STUDENT.uid)?.wellnessGoals).toEqual(["Improve sleep quality and habits"]);
  });

  test("what the student says would help is not stored", async ({ page }) => {
    await seed(page, { tour: true });
    await logIn(page, STUDENT);
    await guide(page).getByRole("button", { name: "Show me around" }).click();
    await guide(page).getByRole("button", { name: "Feeling low" }).click();
    await guide(page).getByRole("button", { name: "Not now" }).click();
    const users = await readCollection(page, "users");
    expect(JSON.stringify(users)).not.toMatch(/Feeling low/);
    expect(users.find((u) => u.id === STUDENT.uid)).not.toHaveProperty("wellnessGoals");
  });

  test("'I need help now' is there from the start and points to 1553 without claiming to alert anyone", async ({
    page,
  }) => {
    await seed(page, { tour: true });
    await logIn(page, STUDENT);
    await guide(page).getByRole("button", { name: "I need help now" }).click();
    await expect(guide(page).getByRole("link", { name: "Call 1553" })).toHaveAttribute("href", "tel:1553");
    await expect(guide(page)).toContainText("This guide cannot alert anyone");
    await expect(guide(page).getByRole("link", { name: "More crisis resources" })).toBeVisible();
  });

  test("'Skip to check-in' ends the guide and it does not come back", async ({ page }) => {
    await seed(page, { tour: true });
    await logIn(page, STUDENT);
    await guide(page).getByRole("button", { name: "Skip to check-in" }).click();
    await expect(guide(page)).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
    await expect(guide(page)).toHaveCount(0);
  });

  test("a student who already saw the old tour gets the short guide, without the welcome", async ({ page }) => {
    await seed(page); // seeds the old tour key
    await logIn(page, STUDENT);
    await expect(guide(page)).toContainText("What would help most right now?");
    await expect(guide(page)).not.toContainText("automated guide, not a person");
  });
});

test.describe("Returning students", () => {
  test("no guide, but a calm moment and talking to someone are one tap away, and no score is shown there", async ({
    page,
  }) => {
    await seed(page);
    await logIn(page, STUDENT);
    await completeCheckIn(page, [0, 0, 0, 0, 0, 0, 0]);
    await page.reload();
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
    await expect(guide(page)).toHaveCount(0);
    await expect(header(page).getByRole("button", { name: "A calm moment" })).toBeVisible();
    await expect(header(page).getByRole("button", { name: "Talk to someone" })).toBeVisible();
    await expect(header(page)).not.toContainText(/\d+ \/ \d+/);
  });

  for (const [risk, total, firstLabel] of [
    ["medium", 12, "Talk to someone"],
    ["low", 2, "A calm moment"],
  ] as const) {
    test(`after a ${risk} result, '${firstLabel}' comes first`, async ({ page }) => {
      await seed(page, {
        docs: {
          assessments: {
            a1: {
              studentId: STUDENT.uid,
              studentName: STUDENT.name,
              studentEmail: STUDENT.email,
              answers: [],
              questionSummary: [],
              total,
              maxScore: 21,
              riskLevel: risk,
              flaggedForImmediateReview: false,
              status: "open",
              createdAt: "2026-09-01T09:00:00.000Z",
            },
          },
        },
      });
      await logIn(page, STUDENT);
      await expect(header(page).getByRole("button", { name: firstLabel })).toBeVisible();
      expect((await header(page).getByRole("button").allInnerTexts())[0]).toContain(firstLabel);
    });
  }
});

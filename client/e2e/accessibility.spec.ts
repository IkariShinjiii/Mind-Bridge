import { test, expect, type Page } from "@playwright/test";
import type { AxeResults } from "axe-core";
import { createRequire } from "node:module";
import { seed, logIn, completeCheckIn, STUDENT, COUNSELOR } from "./helpers";

const axePath = createRequire(import.meta.url).resolve("axe-core/axe.min.js");

const WCAG_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const flaggedCase = {
  studentId: STUDENT.uid,
  studentName: STUDENT.name,
  studentEmail: STUDENT.email,
  answers: [1, 1, 1, 1, 1, 1, 2],
  questionSummary: [
    { id: "q1", text: "Little interest or pleasure", score: 1, isCrisisItem: false },
    { id: "q7", text: "Thoughts that you would be better off not around", score: 2, isCrisisItem: true },
  ],
  total: 8,
  maxScore: 21,
  riskLevel: "high",
  flaggedForImmediateReview: true,
  status: "open",
  counselorNotes: "",
  createdAt: "2026-09-20T10:00:00.000Z",
};

/** Runs axe against the current page and fails with a readable list of WCAG 2.1 A/AA violations. */
async function expectNoViolations(page: Page, label: string): Promise<void> {
  await page.addScriptTag({ path: axePath });
  const results = await page.evaluate(
    (tags) =>
      (window as unknown as { axe: { run: (ctx: Document, opts: object) => Promise<AxeResults> } }).axe.run(document, {
        runOnly: { type: "tag", values: tags },
      }),
    WCAG_AA,
  );
  const summary = results.violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(" "))
        .join("\n    ")}`,
  );
  expect(summary, `${label}: WCAG 2.1 AA violations`).toEqual([]);
}

for (const theme of ["light", "dark"]) {
  test.describe(`Accessibility (WCAG 2.1 AA, ${theme} theme)`, () => {
    test.beforeEach(async ({ page }) => {
      // Entrance animations would make axe sample half-transparent colours.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await seed(page, { docs: { assessments: { c1: flaggedCase } } });
      await page.addInitScript((t) => localStorage.setItem("mindbridge_theme", t), theme);
    });

    test("public pages: home, login and signup have no violations", async ({ page }) => {
      for (const path of ["/", "/login", "/signup", "/privacy-policy"]) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        await expectNoViolations(page, path);
      }
    });

    test("student pages: dashboard, check-in, results, resources, appointments and settings", async ({ page }) => {
      await logIn(page, STUDENT);
      await expect(page).toHaveURL(/\/student\/dashboard$/);
      await expectNoViolations(page, "student dashboard");

      await completeCheckIn(page, [1, 1, 1, 1, 1, 1, 1]);
      await expect(page.getByText("Priority support suggested")).toBeVisible();
      await expectNoViolations(page, "check-in result");

      for (const path of ["/resources", "/appointments", "/settings"]) {
        await page.getByRole("navigation", { name: "Main" }).first().waitFor();
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        await expectNoViolations(page, path);
      }
    });

    test("staff pages: dashboard and the case inspector dialog", async ({ page }) => {
      await logIn(page, COUNSELOR);
      await expect(page.getByRole("heading", { name: "Staff dashboard" })).toBeVisible();
      await expectNoViolations(page, "staff dashboard");

      await page.getByRole("button", { name: "Inspect case" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.waitForTimeout(800); // the dialog springs in with framer-motion, which ignores the media query
      await expectNoViolations(page, "case inspector");
    });
  });
}

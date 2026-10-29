import { test, expect } from "@playwright/test";
import { seed, logIn, STUDENT, COUNSELOR } from "./helpers";

/** A floating local time like the booking flow stores, `hours` from now. */
const inHours = (hours: number): string => {
  const d = new Date(Date.now() + hours * 3600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const session = (status: string, start: string) => ({
  studentId: STUDENT.uid,
  studentName: STUDENT.name,
  studentEmail: STUDENT.email,
  slotId: null,
  counselorId: COUNSELOR.uid,
  counselorName: COUNSELOR.name,
  title: `Session with ${COUNSELOR.name}`,
  start,
  status,
  createdAt: "2026-10-01T00:00:00.000Z",
});

test.describe("Session reminders", () => {
  test("a student sees a reminder for a confirmed session in the next day", async ({ page }) => {
    await seed(page, { docs: { appointments: { a1: session("Confirmed", inHours(5)) } } });
    await logIn(page, STUDENT);
    await page.goto("/student/dashboard");

    const reminder = page.getByRole("status").filter({ hasText: "Reminder: your session with" });
    await expect(reminder).toBeVisible();
    await reminder.getByRole("link", { name: "View details" }).click();
    await expect(page).toHaveURL(/\/appointments/);
  });

  test("no reminder for a pending session or one a week away", async ({ page }) => {
    await seed(page, {
      docs: { appointments: { a1: session("Pending Review", inHours(5)), a2: session("Confirmed", inHours(24 * 7)) } },
    });
    await logIn(page, STUDENT);
    await page.goto("/student/dashboard");
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByText(/Reminder:/)).toHaveCount(0);
  });

  test("the counselor sees a reminder naming the student", async ({ page }) => {
    await seed(page, { docs: { appointments: { a1: session("Confirmed", inHours(3)) } } });
    await logIn(page, COUNSELOR);
    await page.goto("/admin/dashboard");
    await expect(page.getByRole("status").filter({ hasText: /Reminder: your session with \S+ is/ })).toBeVisible();
  });
});

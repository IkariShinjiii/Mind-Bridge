import { test, expect } from "@playwright/test";
import { seed, readCollection, logIn, COUNSELOR, STUDENT } from "./helpers";

const session = (status: string) => ({
  studentId: STUDENT.uid,
  studentName: STUDENT.name,
  studentEmail: STUDENT.email,
  slotId: null,
  counselorName: "Dr. Reyes",
  title: "Session with Dr. Reyes",
  start: "2099-11-02T10:00",
  end: "2099-11-02T11:00",
  status,
  createdAt: "2026-10-01T00:00:00.000Z",
});

/** Changes a stored appointment behind the open page's back, as another person on another device would. */
const changeElsewhere = (page: import("@playwright/test").Page, id: string, status: string) =>
  page.evaluate(
    ([docId, next]) => {
      const key = "mb_e2e_state";
      const state = JSON.parse(localStorage.getItem(key) ?? "{}");
      state.docs.appointments[docId].status = next;
      localStorage.setItem(key, JSON.stringify(state));
    },
    [id, status] as [string, string],
  );

test.describe("appointment lifecycle", () => {
  test("a counselor is told when a request was cancelled before they confirmed it, and nothing is overwritten", async ({
    page,
  }) => {
    await seed(page, { docs: { appointments: { a1: session("Pending Review") } } });
    await logIn(page, COUNSELOR);
    await page.goto("/appointments");
    const confirm = page.getByRole("listitem").getByRole("button", { name: "Confirm", exact: true });
    await expect(confirm).toBeVisible();

    await changeElsewhere(page, "a1", "Cancelled");
    await confirm.click();

    await expect(page.getByText("This appointment was just changed by someone else.")).toBeVisible();
    const stored = (await readCollection(page, "appointments")).find((a) => a.id === "a1");
    expect(stored?.status).toBe("Cancelled");
  });

  test("each status offers the right actions to a counselor", async ({ page }) => {
    await seed(page, {
      docs: {
        appointments: {
          a1: session("Pending Review"),
          a2: session("Confirmed"),
          a3: session("Completed"),
        },
      },
    });
    await logIn(page, COUNSELOR);
    await page.goto("/appointments");

    const pending = page.getByRole("listitem").filter({ hasText: "Pending Review" }).first();
    await expect(pending.getByRole("button")).toHaveText(["Confirm", "Reschedule", "Decline"]);
    const confirmed = page.getByRole("listitem").filter({ hasText: "Add to calendar" });
    await expect(confirmed.getByRole("button")).toHaveText([
      "Add to calendar",
      "Mark completed",
      "Reschedule",
      "Cancel session",
    ]);
    const done = page.getByRole("listitem").filter({ hasText: "Closed. No further actions." });
    await expect(done).toHaveCount(1);
  });

  test("a student can only cancel, and only while the session is still live", async ({ page }) => {
    await seed(page, {
      docs: { appointments: { a1: session("Pending Review"), a2: session("Declined") } },
    });
    await logIn(page, STUDENT);
    await page.goto("/appointments");

    const cards = page.getByRole("listitem");
    await expect(cards.getByRole("button", { name: "Cancel booking" })).toHaveCount(1);
    await expect(cards.getByRole("button", { name: /Confirm|Decline|Reschedule|Mark completed/ })).toHaveCount(0);
  });
});

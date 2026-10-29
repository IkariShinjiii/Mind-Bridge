import { test, expect } from "@playwright/test";
import { seed, logIn, STUDENT } from "./helpers";

const session = (status: string, start = "2099-11-02T10:00") => ({
  studentId: STUDENT.uid,
  studentName: STUDENT.name,
  studentEmail: STUDENT.email,
  slotId: null,
  counselorName: "Dr. Reyes",
  title: "Session with Dr. Reyes",
  start,
  end: "2099-11-02T11:00",
  status,
  createdAt: "2026-10-01T00:00:00.000Z",
});

test.describe("Add to calendar", () => {
  test("a confirmed session downloads an .ics file with its time", async ({ page }) => {
    await seed(page, { docs: { appointments: { a1: session("Confirmed") } } });
    await logIn(page, STUDENT);
    await page.goto("/appointments");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Add to calendar" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("mind-bridge-session.ics");
    const text = (await import("node:fs")).readFileSync((await download.path())!, "utf8");
    expect(text).toContain("BEGIN:VCALENDAR");
    expect(text).toContain("DTSTART:20991102T100000");
    expect(text).toContain("SUMMARY:Session with Dr. Reyes");
    await expect(page.getByRole("status").filter({ hasText: "Calendar file downloaded" })).toBeVisible();
  });

  test("a session that is still pending or already cancelled has no calendar button", async ({ page }) => {
    await seed(page, {
      docs: { appointments: { a1: session("Pending Review"), a2: session("Cancelled", "2099-11-03T10:00") } },
    });
    await logIn(page, STUDENT);
    await page.goto("/appointments");

    await expect(page.getByText("Session with Dr. Reyes").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Add to calendar" })).toHaveCount(0);
  });
});

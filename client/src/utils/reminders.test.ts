import { describe, it, expect } from "vitest";
import type { Appointment } from "../types";
import { sessionsSoon, whenText } from "./reminders";

const now = new Date(2026, 10, 5, 9, 0); // Nov 5, 2026, 9:00 AM local

const apt = (id: string, status: string, start: string | undefined): Appointment => ({
  id,
  studentName: "Maria",
  studentEmail: "m@x.ph",
  slotId: null,
  title: "Session",
  ...(start ? { start } : {}),
  status,
  createdAt: "2026-11-01T00:00:00.000Z",
});

describe("sessionsSoon", () => {
  it("keeps confirmed and rescheduled sessions in the next 24 hours, soonest first", () => {
    const list = [
      apt("later", "Confirmed", "2026-11-05T15:00"),
      apt("sooner", "Rescheduled", "2026-11-05T10:00"),
      apt("tomorrow-ok", "Confirmed", "2026-11-06T08:30"),
    ];
    expect(sessionsSoon(list, now).map((a) => a.id)).toEqual(["sooner", "later", "tomorrow-ok"]);
  });

  it("ignores pending, cancelled and completed sessions, past ones and ones further away", () => {
    const list = [
      apt("pending", "Pending Review", "2026-11-05T10:00"),
      apt("cancelled", "Cancelled", "2026-11-05T10:00"),
      apt("done", "Completed", "2026-11-05T10:00"),
      apt("past", "Confirmed", "2026-11-05T08:00"),
      apt("far", "Confirmed", "2026-11-06T09:30"),
      apt("no-time", "Confirmed", undefined),
      apt("junk", "Confirmed", "not a date"),
    ];
    expect(sessionsSoon(list, now)).toEqual([]);
  });
});

describe("whenText", () => {
  it("says minutes when it is under an hour away", () => {
    expect(whenText(new Date(2026, 10, 5, 9, 45), now)).toBe("in 45 minutes");
    expect(whenText(new Date(2026, 10, 5, 9, 1), now)).toBe("in 1 minute");
  });

  it("says today or tomorrow with the time", () => {
    expect(whenText(new Date(2026, 10, 5, 15, 0), now)).toMatch(/^today at 3:00\s?PM$/);
    expect(whenText(new Date(2026, 10, 6, 8, 30), now)).toMatch(/^tomorrow at 8:30\s?AM$/);
  });
});

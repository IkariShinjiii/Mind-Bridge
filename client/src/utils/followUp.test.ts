import { describe, expect, it } from "vitest";
import { followUpState, formatFollowUp, todayKey } from "./followUp";

const now = new Date(2026, 9, 31, 15, 0); // Oct 31 2026, 3 PM local

describe("todayKey", () => {
  it("uses the local calendar day with zero padding", () => {
    expect(todayKey(now)).toBe("2026-10-31");
    expect(todayKey(new Date(2026, 0, 5, 0, 1))).toBe("2026-01-05");
  });
});

describe("followUpState", () => {
  it("is overdue before today, due today, and upcoming after", () => {
    expect(followUpState("2026-10-30", "open", now)).toBe("overdue");
    expect(followUpState("2026-10-31", "open", now)).toBe("today");
    expect(followUpState("2026-11-01", "escalated", now)).toBe("upcoming");
  });

  it("has no state without a usable date", () => {
    expect(followUpState(undefined, "open", now)).toBeNull();
    expect(followUpState("", "open", now)).toBeNull();
    expect(followUpState("next week", "open", now)).toBeNull();
    expect(followUpState("2026-10-3", "open", now)).toBeNull();
  });

  it("has no state once the case is reviewed", () => {
    expect(followUpState("2026-10-01", "reviewed", now)).toBeNull();
  });

  it("treats a missing status as open", () => {
    expect(followUpState("2026-10-01", undefined, now)).toBe("overdue");
  });
});

describe("formatFollowUp", () => {
  it("shows the stored day, not the day in another time zone", () => {
    expect(formatFollowUp("2026-10-28")).toContain("28");
    expect(formatFollowUp("2026-11-01")).toContain("1");
  });
});

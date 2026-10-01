import { describe, it, expect } from "vitest";
import { toLocalInputValue, formatDateTime } from "./dates";

describe("toLocalInputValue", () => {
  it("round-trips a local time without shifting the hour", () => {
    const local = new Date(2026, 9, 2, 9, 30); // 2 Oct 2026, 09:30 local
    expect(toLocalInputValue(local)).toBe("2026-10-02T09:30");
    expect(new Date(toLocalInputValue(local)).getTime()).toBe(local.getTime());
  });
  it("returns an empty string for missing or invalid input", () => {
    expect(toLocalInputValue("")).toBe("");
    expect(toLocalInputValue(null)).toBe("");
    expect(toLocalInputValue("not a date")).toBe("");
  });
});

describe("formatDateTime", () => {
  it("passes free text through and handles empties", () => {
    expect(formatDateTime("Tomorrow afternoon")).toBe("Tomorrow afternoon");
    expect(formatDateTime(null)).toBe("Not specified");
    expect(formatDateTime(undefined, "TBD")).toBe("TBD");
  });
  it("formats a real date", () => {
    expect(formatDateTime(new Date(2026, 9, 2, 9, 30))).toMatch(/2026|Oct/);
  });
});

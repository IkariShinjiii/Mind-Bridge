import { describe, it, expect } from "vitest";
import { toLocalInputValue, formatDateTime } from "./dates";

describe("toLocalInputValue edge cases", () => {
  it("zero-pads month, day, hour and minute", () => {
    expect(toLocalInputValue(new Date(2026, 0, 5, 3, 7))).toBe("2026-01-05T03:07");
  });
  it("accepts epoch milliseconds and ISO strings and renders them in local time", () => {
    const d = new Date(2026, 9, 2, 23, 59);
    expect(toLocalInputValue(d.getTime())).toBe("2026-10-02T23:59");
    expect(toLocalInputValue(d.toISOString())).toBe("2026-10-02T23:59");
  });
  it("handles midnight and the end of the year", () => {
    expect(toLocalInputValue(new Date(2026, 11, 31, 0, 0))).toBe("2026-12-31T00:00");
    expect(toLocalInputValue(new Date(2027, 0, 1, 0, 0))).toBe("2027-01-01T00:00");
  });
  it("handles a leap day", () => {
    expect(toLocalInputValue(new Date(2028, 1, 29, 12, 0))).toBe("2028-02-29T12:00");
  });
  it("drops seconds and milliseconds", () => {
    expect(toLocalInputValue(new Date(2026, 9, 2, 9, 30, 59, 999))).toBe("2026-10-02T09:30");
  });
  it.each([[undefined], [null], [""], ["garbage"], [NaN], [new Date("nope")], [false]])("returns '' for %j", (v) => {
    expect(toLocalInputValue(v)).toBe("");
  });
  it("treats epoch 0 as missing (falsy), a known quirk", () => {
    expect(toLocalInputValue(0)).toBe("");
  });
  it("output is always accepted back by Date as the same local minute", () => {
    for (const d of [new Date(2026, 2, 8, 2, 30), new Date(2026, 10, 1, 1, 30), new Date(2026, 5, 15, 13, 45)]) {
      const out = toLocalInputValue(d);
      expect(out).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
      expect(toLocalInputValue(new Date(out))).toBe(out);
    }
  });
});

describe("formatDateTime edge cases", () => {
  it("returns the default or custom text for every falsy value", () => {
    for (const v of [null, undefined, "", 0, false]) expect(formatDateTime(v)).toBe("Not specified");
    expect(formatDateTime("", "n/a")).toBe("n/a");
  });
  it("passes through free text that has no '-' or '/'", () => {
    expect(formatDateTime("Tomorrow afternoon")).toBe("Tomorrow afternoon");
    expect(formatDateTime("TBD")).toBe("TBD");
  });
  it("returns unparseable text containing '-' or '/' unchanged instead of 'Invalid Date'", () => {
    expect(formatDateTime("sometime next-week")).toBe("sometime next-week");
    expect(formatDateTime("Mon/Tue")).toBe("Mon/Tue");
  });
  it("formats ISO strings, Date objects and timestamps", () => {
    const d = new Date(2026, 9, 2, 9, 30);
    for (const v of [d, d.toISOString(), d.getTime()]) {
      const out = formatDateTime(v);
      expect(out).not.toMatch(/Invalid/);
      expect(out).toMatch(/2026/);
      expect(out).toMatch(/9:30|09:30/);
    }
  });
  // KNOWN ISSUE: an invalid Date object falls through to String(value) and displays "Invalid Date".
  // Strings are handled; only Date objects hit this. Flip to `it` once formatDateTime returns `empty`.
  it.fails("never returns 'Invalid Date' for an invalid Date object", () => {
    expect(formatDateTime(new Date("nope"))).not.toMatch(/Invalid Date/i);
  });
});

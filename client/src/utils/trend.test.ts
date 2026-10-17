import { describe, it, expect } from "vitest";
import { bandLimits, describeChange, summarizeTrend, checkInNudge } from "./trend";

const pt = (score: number, date?: string) => ({ score, max: 21, date });

describe("bandLimits", () => {
  it("matches the 0-6 / 7-12 / 13+ bands of the 21-point check-in", () => {
    expect(bandLimits(21)).toEqual({ lowTop: 6, mediumTop: 12 });
  });
  it("scales to a longer check-in", () => {
    expect(bandLimits(48)).toEqual({ lowTop: 14, mediumTop: 28 });
  });
});

describe("summarizeTrend", () => {
  it("returns null with no check-ins", () => {
    expect(summarizeTrend([])).toBeNull();
  });

  it("has no comparison for a single check-in", () => {
    const s = summarizeTrend([pt(8, "2026-10-10T00:00:00Z")], new Date("2026-10-15T12:00:00Z"));
    expect(s).toMatchObject({ count: 1, latest: 8, change: null, direction: null, daysAgo: 5, average: 8, lowest: 8 });
  });

  it("compares the latest with the one before and averages all of them", () => {
    const s = summarizeTrend([pt(10), pt(4), pt(7)])!;
    expect(s).toMatchObject({ change: 3, direction: "higher", average: 7, lowest: 4, count: 3, daysAgo: null });
  });

  it("never reports a negative number of days", () => {
    expect(summarizeTrend([pt(1, "2026-10-20T00:00:00Z")], new Date("2026-10-15T00:00:00Z"))!.daysAgo).toBe(0);
  });
});

describe("describeChange", () => {
  it("speaks plainly in each direction", () => {
    expect(describeChange(summarizeTrend([pt(9), pt(6)])!)).toBe("3 points lower than your last check-in. Fewer difficulties this time.");
    expect(describeChange(summarizeTrend([pt(5), pt(6)])!)).toBe("1 point higher than your last check-in. Things have felt harder lately.");
    expect(describeChange(summarizeTrend([pt(5), pt(5)])!)).toBe("Same as your last check-in.");
    expect(describeChange(summarizeTrend([pt(5)])!)).toMatch(/first check-in/);
  });
});

describe("checkInNudge", () => {
  it("stays quiet for a recent check-in or an unknown date", () => {
    expect(checkInNudge(0)).toBeNull();
    expect(checkInNudge(13)).toBeNull();
    expect(checkInNudge(null)).toBeNull();
  });

  it("starts at two weeks and counts whole weeks", () => {
    expect(checkInNudge(14)).toMatch(/2 weeks ago/);
    expect(checkInNudge(20)).toMatch(/2 weeks ago/);
    expect(checkInNudge(30)).toMatch(/4 weeks ago/);
  });
});

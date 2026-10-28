import { describe, it, expect } from "vitest";
import { goingWell } from "./goingWell";

describe("goingWell", () => {
  it("lists a line for each quick question answered 0, in question order", () => {
    expect(goingWell({ answers: [0, 2, 0, 1, 1, 0, 0] })).toEqual([
      "You are still finding interest in your daily activities.",
      "You are sleeping reasonably well.",
      "You can concentrate on your schoolwork.",
    ]);
  });

  it("never mentions the safety item, even when it is 0", () => {
    expect(goingWell({ answers: [3, 3, 3, 3, 3, 3, 0] })).toEqual([]);
  });

  it("stops at the limit", () => {
    expect(goingWell({ answers: [0, 0, 0, 0, 0, 0, 0] })).toHaveLength(4);
    expect(goingWell({ answers: [0, 0, 0, 0, 0, 0, 0] }, 2)).toHaveLength(2);
  });

  it("handles the full check-in and skips PHQ-9 item 9", () => {
    const answers = [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1];
    expect(goingWell({ answers })).toEqual(["You have not felt nervous or on edge."]);
  });

  it("falls back to the stored question summary", () => {
    const questionSummary = [0, 3, 3, 3, 3, 3, 3].map((score) => ({ score }));
    expect(goingWell({ answers: [], questionSummary })).toEqual([
      "You are still finding interest in your daily activities.",
    ]);
  });

  it("returns nothing for an unrecognised shape", () => {
    expect(goingWell({ answers: [0, 0, 0] })).toEqual([]);
    expect(goingWell({})).toEqual([]);
  });
});

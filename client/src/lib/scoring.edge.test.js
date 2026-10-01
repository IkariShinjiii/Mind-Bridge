import { describe, it, expect } from "vitest";
import { scoreAnswers } from "./scoring";

const plain = (n) => Array.from({ length: n }, (_, i) => ({ id: `q${i + 1}` }));

describe("scoreAnswers edge cases", () => {
  it("band boundaries are inclusive: 30% is medium, 60% is high (10 questions, max 30)", () => {
    const fill = (sum) => { const a = Array(10).fill(0); let left = sum; for (let i = 0; left > 0; i++) { a[i] = Math.min(3, left); left -= a[i]; } return a; };
    expect(scoreAnswers(fill(8), plain(10)).riskLevel).toBe("low");
    expect(scoreAnswers(fill(9), plain(10)).riskLevel).toBe("medium");
    expect(scoreAnswers(fill(17), plain(10)).riskLevel).toBe("medium");
    expect(scoreAnswers(fill(18), plain(10)).riskLevel).toBe("high");
  });

  it("maxScore is 3 per question", () => {
    expect(scoreAnswers([0, 0], plain(2)).maxScore).toBe(6);
    expect(scoreAnswers([0, 0, 0, 0], plain(4)).maxScore).toBe(12);
  });

  it("with no questions, the answer count defines maxScore", () => {
    expect(scoreAnswers([1, 1, 1])).toMatchObject({ total: 3, maxScore: 9, riskLevel: "medium", flaggedForImmediateReview: false });
  });

  it("questions define the count when there are more answers than questions, but all answers are summed", () => {
    expect(scoreAnswers([1, 1, 1, 1], plain(2))).toMatchObject({ total: 4, maxScore: 6 });
  });

  it("coerces numeric strings and treats junk as zero", () => {
    expect(scoreAnswers(["2", "x", undefined, NaN, null, 1], plain(6)).total).toBe(3);
  });

  it("a crisis item flags only when its own answer is above zero", () => {
    const qs = [{ id: "a" }, { id: "b", isCrisisItem: true }];
    expect(scoreAnswers([3, 0], qs).flaggedForImmediateReview).toBe(false);
    expect(scoreAnswers([0, null], qs).flaggedForImmediateReview).toBe(false);
    expect(scoreAnswers([0, "1"], qs)).toMatchObject({ flaggedForImmediateReview: true, riskLevel: "high" });
  });

  it("answers to non-crisis items never raise the immediate-review flag", () => {
    expect(scoreAnswers([3, 3, 3], plain(3)).flaggedForImmediateReview).toBe(false);
  });

  it("an empty submission is classed high (0 >= 0 * 0.6) but not flagged for immediate review", () => {
    expect(scoreAnswers([], [])).toEqual({ total: 0, maxScore: 0, riskLevel: "high", flaggedForImmediateReview: false });
  });

  it("does not mutate its inputs", () => {
    const answers = [1, 2]; const qs = [{ id: "a" }, { id: "b" }];
    scoreAnswers(answers, qs);
    expect(answers).toEqual([1, 2]);
    expect(qs).toEqual([{ id: "a" }, { id: "b" }]);
  });
});

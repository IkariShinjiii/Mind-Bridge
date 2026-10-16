import { describe, it, expect } from "vitest";
import { scoreAnswers } from "./scoring";

const qs = [
  { id: "q1" },
  { id: "q2" },
  { id: "q3" },
  { id: "q4" },
  { id: "q5" },
  { id: "q6" },
  { id: "q7", isCrisisItem: true },
];

describe("scoreAnswers", () => {
  it("is low when everything is zero", () => {
    expect(scoreAnswers([0, 0, 0, 0, 0, 0, 0], qs).riskLevel).toBe("low");
  });
  it("is medium at 30% of max (7 questions, max 21, 7 points)", () => {
    expect(scoreAnswers([3, 3, 1, 0, 0, 0, 0], qs).riskLevel).toBe("medium");
  });
  it("is high at 60% of max", () => {
    expect(scoreAnswers([3, 3, 3, 3, 1, 0, 0], qs).riskLevel).toBe("high");
  });
  it("any crisis answer forces high and flags review, even with a low total", () => {
    const r = scoreAnswers([0, 0, 0, 0, 0, 0, 1], qs);
    expect(r.riskLevel).toBe("high");
    expect(r.flaggedForImmediateReview).toBe(true);
  });
  it("treats unanswered (null) items as zero", () => {
    expect(scoreAnswers([null, null, null, null, null, null, null], qs).total).toBe(0);
  });
});

describe("scoreAnswers for the 16-question full check-in", () => {
  const questions = Array.from({ length: 16 }, (_, i) => ({ isCrisisItem: i === 8 }));

  it("scores out of 48 and applies the published scale bands on top of the percentage rule", () => {
    // PHQ-9 = 15 (items 1 to 7), nothing else: 15 of 48 is only 31% by percentage, but PHQ-9 15 is high.
    const answers = [2, 2, 2, 2, 2, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(scoreAnswers(answers, questions)).toMatchObject({ total: 15, maxScore: 48, riskLevel: "high" });
  });

  it("never goes below the percentage rule", () => {
    const answers = Array(16).fill(2); // 32 of 48 = 67%
    expect(scoreAnswers(answers, questions).riskLevel).toBe("high");
  });

  it("flags the PHQ-9 safety item", () => {
    const answers = [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0];
    expect(scoreAnswers(answers, questions)).toMatchObject({ flaggedForImmediateReview: true, riskLevel: "high" });
  });
});

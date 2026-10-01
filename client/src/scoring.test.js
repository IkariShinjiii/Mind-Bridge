import { describe, it, expect } from "vitest";
import { scoreAnswers } from "./scoring";

const qs = [
  { id: "q1" }, { id: "q2" }, { id: "q3" },
  { id: "q4" }, { id: "q5" }, { id: "q6" },
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

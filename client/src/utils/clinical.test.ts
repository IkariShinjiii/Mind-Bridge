import { describe, it, expect } from "vitest";
import { gad7Band, phq9Band, quickScreen, QUICK_SOURCE } from "./clinical";
import { scoreAnswers } from "./scoring";

describe("published bands", () => {
  it("PHQ-9 edges", () => {
    const at = (n: number) => phq9Band(n).severity;
    expect([at(0), at(4), at(5), at(9), at(10), at(14), at(15), at(19), at(20), at(27)]).toEqual([
      "minimal", "minimal", "mild", "mild", "moderate", "moderate", "moderately-severe", "moderately-severe", "severe", "severe",
    ]);
  });
  it("GAD-7 edges", () => {
    const at = (n: number) => gad7Band(n).severity;
    expect([at(0), at(4), at(5), at(9), at(10), at(14), at(15), at(21)]).toEqual([
      "minimal", "minimal", "mild", "mild", "moderate", "moderate", "severe", "severe",
    ]);
  });
});

describe("quick check-in against the published screens", () => {
  it("maps seven questions to their source items", () => {
    expect(QUICK_SOURCE).toHaveLength(7);
  });

  it("finds the PHQ-2 and GAD-2 inside the answers", () => {
    expect(quickScreen([2, 1, 0, 3, 0, 0, 0])).toEqual({ phq2: 3, gad2: 3, phq2Positive: true, gad2Positive: true });
    expect(quickScreen([1, 1, 3, 1, 1, 3, 0])).toMatchObject({ phq2Positive: false, gad2Positive: false });
  });

  // Known disagreement, documented in docs/SCORING.md: positive on both published two-question screens,
  // yet only 6 of 21 points, which the percentage rule calls low.
  it("shows a student positive on both screens can still score low on the percentage rule", () => {
    const answers = [2, 1, 0, 2, 1, 0, 0];
    expect(quickScreen(answers)).toMatchObject({ phq2Positive: true, gad2Positive: true });
    expect(scoreAnswers(answers, [{}, {}, {}, {}, {}, {}, { isCrisisItem: true }]).riskLevel).toBe("low");
  });
});

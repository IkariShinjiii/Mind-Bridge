import { describe, it, expect } from "vitest";
import { gad7Band, phq9Band, quickScreen, QUICK_SOURCE, scoreFull } from "./clinical";
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

describe("scoreFull", () => {
  const answers = (phq: number[], gad: number[]) => [...phq, ...gad];
  const zeros9 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  const zeros7 = [0, 0, 0, 0, 0, 0, 0];

  it("sums each scale on its own and names the published band", () => {
    const r = scoreFull(answers([1, 1, 1, 1, 1, 1, 1, 1, 0], [1, 1, 1, 0, 0, 0, 0]));
    expect(r).toMatchObject({ phq9: 8, gad7: 3, safetyItem: false, level: "low" });
    expect(r.phq9Band.severity).toBe("mild");
    expect(r.gad7Band.severity).toBe("minimal");
  });

  it("any answer on PHQ-9 item 9 is high", () => {
    expect(scoreFull(answers([0, 0, 0, 0, 0, 0, 0, 0, 1], zeros7))).toMatchObject({ safetyItem: true, level: "high" });
  });

  it("PHQ-9 of 15 or GAD-7 of 15 is high; 10 to 14 on either is medium", () => {
    expect(scoreFull(answers([2, 2, 2, 2, 2, 2, 3, 0, 0], zeros7)).level).toBe("high"); // PHQ-9 = 15
    expect(scoreFull(answers(zeros9, [3, 3, 3, 3, 3, 0, 0])).level).toBe("high"); // GAD-7 = 15
    expect(scoreFull(answers([2, 2, 2, 2, 2, 0, 0, 0, 0], zeros7)).level).toBe("medium"); // PHQ-9 = 10
    expect(scoreFull(answers(zeros9, [2, 2, 2, 2, 2, 0, 0])).level).toBe("medium"); // GAD-7 = 10
  });

  it("a positive PHQ-2 or GAD-2 is at least medium, reading the GAD items from their own positions", () => {
    expect(scoreFull(answers([2, 1, 0, 0, 0, 0, 0, 0, 0], zeros7)).level).toBe("medium");
    expect(scoreFull(answers(zeros9, [2, 1, 0, 0, 0, 0, 0])).level).toBe("medium");
    // Items 4 and 5 of the PHQ-9 are NOT the GAD-2.
    expect(scoreFull(answers([0, 0, 0, 2, 1, 0, 0, 0, 0], zeros7)).level).toBe("low");
  });
});

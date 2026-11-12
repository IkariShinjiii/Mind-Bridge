import { describe, expect, it } from "vitest";
import { makeAssessment, seededRandom } from "../test/factories";
import { scoreAnswers } from "./scoring";
import { withVerifiedRisk } from "./risk";
import { scoreFull, scoreWho5, phq9Band, gad7Band } from "./clinical";

const RANK = { low: 0, medium: 1, high: 2 } as const;
const answersOf = (rand: () => number, n: number, max = 3) =>
  Array.from({ length: n }, () => Math.floor(rand() * (max + 1)));

describe("risk scoring invariants (seeded random sweep)", () => {
  it("quick check-in: any crisis answer above 0 is always high and flagged", () => {
    const rand = seededRandom(1);
    for (let i = 0; i < 300; i++) {
      const a = answersOf(rand, 7);
      a[6] = 1 + Math.floor(rand() * 3);
      const questions = a.map((_, j) => ({ isCrisisItem: j === 6 }));
      const r = scoreAnswers(a, questions);
      expect(r.riskLevel).toBe("high");
      expect(r.flaggedForImmediateReview).toBe(true);
    }
  });

  it("quick check-in: without the crisis answer the level follows the 30% and 60% cut-offs exactly", () => {
    const rand = seededRandom(2);
    for (let i = 0; i < 300; i++) {
      const a = answersOf(rand, 7);
      a[6] = 0;
      const total = a.reduce((s, v) => s + v, 0);
      const expected = total >= 13 ? "high" : total >= 7 ? "medium" : "low";
      expect(
        scoreAnswers(
          a,
          a.map((_, j) => ({ isCrisisItem: j === 6 })),
        ).riskLevel,
      ).toBe(expected);
    }
  });

  it("withVerifiedRisk never lowers a stored level, and agrees with scoreAnswers on honest records", () => {
    const rand = seededRandom(3);
    for (let i = 0; i < 400; i++) {
      const a = answersOf(rand, 7);
      const honest = scoreAnswers(
        a,
        a.map((_, j) => ({ isCrisisItem: j === 6 })),
      );
      const stored = (["low", "medium", "high"] as const)[Math.floor(rand() * 3)];
      const out = withVerifiedRisk(makeAssessment({ answers: a, riskLevel: stored, flaggedForImmediateReview: false }));
      expect(RANK[out.riskLevel]).toBeGreaterThanOrEqual(RANK[stored]);
      expect(RANK[out.riskLevel]).toBeGreaterThanOrEqual(RANK[honest.riskLevel]);
    }
  });

  it("a tampered 'low' record with a high total is corrected up and records the claimed level", () => {
    const a = [3, 3, 3, 3, 3, 0, 0];
    const out = withVerifiedRisk(makeAssessment({ answers: a, riskLevel: "low" }));
    expect(out.riskLevel).toBe("high");
    expect(out.riskCorrectedFrom).toBe("low");
  });

  it("full check-in: scoreAnswers is never lower than the published-band level", () => {
    const rand = seededRandom(4);
    for (let i = 0; i < 400; i++) {
      const a = answersOf(rand, 16);
      const published = scoreFull(a).level;
      const r = scoreAnswers(
        a,
        a.map((_, j) => ({ isCrisisItem: j === 8 })),
      );
      expect(RANK[r.riskLevel]).toBeGreaterThanOrEqual(RANK[published]);
    }
  });

  it("PHQ-9 item 9 above 0 is high in the full check-in", () => {
    const a = Array(16).fill(0);
    a[8] = 1;
    expect(scoreFull(a).level).toBe("high");
    expect(scoreFull(a).safetyItem).toBe(true);
  });

  it("band boundaries: PHQ-9 and GAD-7 switch exactly at the published scores", () => {
    const phq = [
      [0, "minimal"],
      [4, "minimal"],
      [5, "mild"],
      [9, "mild"],
      [10, "moderate"],
      [14, "moderate"],
      [15, "moderately-severe"],
      [19, "moderately-severe"],
      [20, "severe"],
      [27, "severe"],
    ] as const;
    for (const [s, sev] of phq) expect(phq9Band(s).severity).toBe(sev);
    const gad = [
      [0, "minimal"],
      [4, "minimal"],
      [5, "mild"],
      [9, "mild"],
      [10, "moderate"],
      [14, "moderate"],
      [15, "severe"],
      [21, "severe"],
    ] as const;
    for (const [s, sev] of gad) expect(gad7Band(s).severity).toBe(sev);
  });

  it("WHO-5: raw 12 is low (48), raw 13 is not (52); out-of-range answers are clamped", () => {
    expect(scoreWho5([3, 3, 2, 2, 2])).toMatchObject({ raw: 12, score: 48, low: true });
    expect(scoreWho5([3, 3, 3, 2, 2])).toMatchObject({ raw: 13, score: 52, low: false });
    expect(scoreWho5([9, 9, 9, 9, 9]).score).toBe(100);
    expect(scoreWho5([-4, -4, -4, -4, -4]).score).toBe(0);
  });
});

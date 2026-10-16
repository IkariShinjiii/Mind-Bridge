import { describe, it, expect } from "vitest";
import { withVerifiedRisk } from "./risk";
import type { Assessment } from "../types";

const base = (over: Partial<Assessment> = {}): Assessment => ({
  id: "a1",
  studentId: "s1",
  studentName: "Ana",
  studentEmail: "ana@usa.edu.ph",
  answers: [],
  questionSummary: [],
  total: 2,
  maxScore: 21,
  riskLevel: "low",
  flaggedForImmediateReview: false,
  status: "open",
  counselorNotes: "",
  createdAt: "2026-10-01T00:00:00.000Z",
  ...over,
});

describe("withVerifiedRisk", () => {
  it("leaves a consistent record untouched", () => {
    const out = withVerifiedRisk(base());
    expect(out).toMatchObject({ riskLevel: "low", flaggedForImmediateReview: false });
    expect(out.riskCorrectedFrom).toBeUndefined();
  });

  it("raises a max score filed as low to high and says what it claimed", () => {
    const out = withVerifiedRisk(base({ total: 21, riskLevel: "low" }));
    expect(out).toMatchObject({ riskLevel: "high", riskCorrectedFrom: "low" });
  });

  it("raises on the 30% and 60% thresholds exactly", () => {
    expect(withVerifiedRisk(base({ total: 6 })).riskLevel).toBe("low");
    expect(withVerifiedRisk(base({ total: 7 })).riskLevel).toBe("medium");
    expect(withVerifiedRisk(base({ total: 12 })).riskLevel).toBe("medium");
    expect(withVerifiedRisk(base({ total: 13 })).riskLevel).toBe("high");
  });

  it("a crisis answer above zero forces high and the safety flag, whatever the record says", () => {
    const out = withVerifiedRisk(
      base({ total: 1, questionSummary: [{ id: "q7", text: "Safety", score: 1, isCrisisItem: true }] }),
    );
    expect(out).toMatchObject({ riskLevel: "high", flaggedForImmediateReview: true, riskCorrectedFrom: "low" });
  });

  it("a crisis item answered zero does not raise anything", () => {
    const out = withVerifiedRisk(
      base({ questionSummary: [{ id: "q7", text: "Safety", score: 0, isCrisisItem: true }] }),
    );
    expect(out.riskCorrectedFrom).toBeUndefined();
    expect(out.flaggedForImmediateReview).toBe(false);
  });

  it("adds a missing safety flag even when the level was already high", () => {
    const out = withVerifiedRisk(
      base({
        total: 15,
        riskLevel: "high",
        questionSummary: [{ id: "q7", text: "Safety", score: 2, isCrisisItem: true }],
      }),
    );
    expect(out).toMatchObject({ riskLevel: "high", flaggedForImmediateReview: true, riskCorrectedFrom: "high" });
  });

  it("never lowers: a record saying high with a small score stays high and is not marked corrected", () => {
    const out = withVerifiedRisk(base({ total: 1, riskLevel: "high", flaggedForImmediateReview: true }));
    expect(out).toMatchObject({ riskLevel: "high", flaggedForImmediateReview: true });
    expect(out.riskCorrectedFrom).toBeUndefined();
  });

  it("treats a missing or odd stored level as low, and a missing maximum as no evidence", () => {
    expect(withVerifiedRisk(base({ riskLevel: undefined as never, total: 0, maxScore: 0 })).riskLevel).toBe("low");
    expect(withVerifiedRisk(base({ riskLevel: "HIGH" as never, total: 0 })).riskLevel).toBe("high");
    expect(withVerifiedRisk(base({ riskLevel: "weird" as never, total: 0 })).riskLevel).toBe("low");
  });

  it("copes with a missing question summary and junk numbers", () => {
    const out = withVerifiedRisk(base({ questionSummary: undefined as never, total: "x" as never }));
    expect(out.riskLevel).toBe("low");
  });
});

describe("positive PHQ-2 / GAD-2 screen", () => {
  const answers = [2, 1, 0, 2, 1, 0, 0];

  it("lifts a low check-in to medium and says why, without calling it a correction", () => {
    const out = withVerifiedRisk(base({ answers, total: 6 }));
    expect(out).toMatchObject({ riskLevel: "medium", screenRaised: true, flaggedForImmediateReview: false });
    expect(out.riskCorrectedFrom).toBeUndefined();
  });

  it("reads the scores from the question summary when answers are missing", () => {
    const questionSummary = answers.map((score, i) => ({ id: `q${i + 1}`, text: "", score, isCrisisItem: i === 6 }));
    expect(withVerifiedRisk(base({ answers: [], questionSummary, total: 6 })).riskLevel).toBe("medium");
  });

  it("leaves negative screens low, and never lowers or touches higher levels", () => {
    expect(withVerifiedRisk(base({ answers: [1, 1, 0, 1, 1, 1, 0], total: 5 })).riskLevel).toBe("low");
    const high = withVerifiedRisk(base({ answers, total: 6, riskLevel: "high" }));
    expect(high.riskLevel).toBe("high");
    expect(high.screenRaised).toBeUndefined();
  });

  it("ignores check-ins that are not the seven-question quick form", () => {
    expect(withVerifiedRisk(base({ answers: [3, 3, 3, 3] })).riskLevel).toBe("low");
  });
});

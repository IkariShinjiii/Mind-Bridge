import type { Assessment, RiskLevel } from "../types";
import { quickAnswersOf, quickScreen } from "./clinical";

const RANK: Readonly<Record<RiskLevel, number>> = { low: 0, medium: 1, high: 2 };

const asLevel = (value: unknown): RiskLevel => {
  const v = String(value ?? "").toLowerCase();
  return v === "high" || v === "medium" ? v : "low";
};

/**
 * Re-checks a stored check-in against its own score and crisis answers, with the same thresholds as `scoreAnswers`
 * (high at 60% of the maximum or any crisis item above zero, medium from 30%).
 *
 * The risk level and safety flag are written by the student's browser, so they cannot be trusted on their own
 * (security audit F-03). This only ever RAISES them, never lowers: a record that says "high" stays high.
 * `riskCorrectedFrom` is set, with the level the record claimed, when anything had to be raised.
 */
export function withVerifiedRisk(assessment: Assessment): Assessment {
  const total = Number(assessment.total) || 0;
  const maxScore = Number(assessment.maxScore) || 0;
  const crisis = (assessment.questionSummary ?? []).some((q) => Boolean(q.isCrisisItem) && Number(q.score) > 0);

  let fromScore: RiskLevel = "low";
  if (crisis || (maxScore > 0 && total >= maxScore * 0.6)) fromScore = "high";
  else if (maxScore > 0 && total >= maxScore * 0.3) fromScore = "medium";

  const stored = asLevel(assessment.riskLevel);
  const riskLevel = RANK[fromScore] > RANK[stored] ? fromScore : stored;
  const flaggedForImmediateReview = Boolean(assessment.flaggedForImmediateReview) || crisis;

  // A positive PHQ-2 or GAD-2 (3 or more of 6) lifts a low check-in to medium. Never lowers, and never alerts: only high does.
  const answers = quickAnswersOf(assessment);
  const screen = answers ? quickScreen(answers) : null;
  const screenRaised = riskLevel === "low" && Boolean(screen && (screen.phq2Positive || screen.gad2Positive));
  const level: RiskLevel = screenRaised ? "medium" : riskLevel;

  const raised = riskLevel !== stored || flaggedForImmediateReview !== Boolean(assessment.flaggedForImmediateReview);
  const extra = screenRaised ? { screenRaised: true } : {};
  if (!raised) return { ...assessment, riskLevel: level, ...extra };
  return { ...assessment, riskLevel: level, flaggedForImmediateReview, riskCorrectedFrom: stored, ...extra };
}

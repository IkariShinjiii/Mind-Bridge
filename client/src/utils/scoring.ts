import type { RiskLevel } from "../types";

/** The parts of a question that scoring looks at. Extra fields are fine. */
export interface QuestionLike {
  id?: string;
  text?: string;
  isCrisisItem?: boolean;
}

/** Outcome of scoring one check-in. */
export interface ScoreResult {
  total: number;
  maxScore: number;
  riskLevel: RiskLevel;
  flaggedForImmediateReview: boolean;
}

// Single source of truth for check-in scoring. The Cloud Function in
// functions/index.js applies the same rules (high >= 60% of max, or any
// crisis item above zero) when it decides whether to alert staff.

/**
 * Scores a check-in. Each answer is 0 to 3; risk is "high" when any crisis item is above zero or the
 * total reaches 60% of the maximum, "medium" from 30%, otherwise "low".
 * @param {Array<number|string|null>} answers - one value per question (null counts as 0)
 * @param {Array<{ isCrisisItem?: boolean }>} [questions] - question metadata, same order as answers
 * @returns {{ total: number, maxScore: number, riskLevel: "low"|"medium"|"high", flaggedForImmediateReview: boolean }}
 */
export function scoreAnswers(
  answers: ReadonlyArray<number | string | null | undefined>,
  questions: ReadonlyArray<QuestionLike> = [],
): ScoreResult {
  const count = questions.length || answers.length;
  const total: number = answers.reduce<number>((sum, v) => sum + (Number(v) || 0), 0);
  const maxScore = count * 3;
  const flaggedForImmediateReview = questions.some((q, i) => Boolean(q.isCrisisItem) && Number(answers[i]) > 0);

  let riskLevel: RiskLevel = "low";
  if (flaggedForImmediateReview || total >= maxScore * 0.6) riskLevel = "high";
  else if (total >= maxScore * 0.3) riskLevel = "medium";

  return { total, maxScore, riskLevel, flaggedForImmediateReview };
}

// Single source of truth for check-in scoring. The Cloud Function in
// functions/index.js applies the same rules (high >= 60% of max, or any
// crisis item above zero) when it decides whether to alert staff.

export function scoreAnswers(answers, questions = []) {
  const count = questions.length || answers.length;
  const total = answers.reduce((sum, v) => sum + (Number(v) || 0), 0);
  const maxScore = count * 3;
  const flaggedForImmediateReview = questions.some(
    (q, i) => q.isCrisisItem && Number(answers[i]) > 0
  );

  let riskLevel = "low";
  if (flaggedForImmediateReview || total >= maxScore * 0.6) riskLevel = "high";
  else if (total >= maxScore * 0.3) riskLevel = "medium";

  return { total, maxScore, riskLevel, flaggedForImmediateReview };
}

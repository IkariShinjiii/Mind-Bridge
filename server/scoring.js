// scoring.js
// Rule-based risk scoring. Start here; you can swap in an ML/LLM model later
// without changing anything else in the app, since this file has one job:
// take answers in, return a score + risk level.

// Each question is answered on a 0-3 scale:
// 0 = Not at all, 1 = Several days, 2 = More than half the days, 3 = Nearly every day
// This mirrors the response style of validated instruments like the PHQ-9/GAD-7,
// which makes the scoring defensible and easy to explain in your proposal.

export const SURVEY_QUESTIONS = [
  { id: "q1", text: "Little interest or pleasure in doing things" },
  { id: "q2", text: "Feeling down, depressed, or hopeless" },
  { id: "q3", text: "Trouble falling or staying asleep, or sleeping too much" },
  { id: "q4", text: "Feeling tired or having little energy" },
  { id: "q5", text: "Poor appetite or overeating" },
  { id: "q6", text: "Feeling nervous, anxious, or on edge" },
  { id: "q7", text: "Not being able to stop or control worrying" },
  { id: "q8", text: "Trouble concentrating on schoolwork" },
  { id: "q9", text: "Feeling that things would be better if you weren't around" },
];

// q9 is a self-harm screening item and is weighted much higher on purpose:
// any non-zero answer here should surface immediately regardless of the total score.
const HIGH_PRIORITY_QUESTIONS = ["q9"];

export function scoreSurvey(answers) {
  // answers: { q1: 0-3, q2: 0-3, ... }
  let total = 0;
  let highPriorityTriggered = false;

  for (const q of SURVEY_QUESTIONS) {
    const value = Number(answers[q.id] ?? 0);
    total += value;
    if (HIGH_PRIORITY_QUESTIONS.includes(q.id) && value > 0) {
      highPriorityTriggered = true;
    }
  }

  const maxScore = SURVEY_QUESTIONS.length * 3;

  let riskLevel = "low";
  if (total >= maxScore * 0.6) riskLevel = "high";
  else if (total >= maxScore * 0.3) riskLevel = "medium";

  if (highPriorityTriggered) riskLevel = "high";

  return {
    total,
    maxScore,
    riskLevel,
    flaggedForImmediateReview: highPriorityTriggered,
  };
}

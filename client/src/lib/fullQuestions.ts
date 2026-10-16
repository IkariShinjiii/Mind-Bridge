import type { ScreeningQuestion } from "../types";

/**
 * The optional full check-in: the PHQ-9 (depression, 9 questions) followed by the GAD-7 (anxiety, 7 questions), with the
 * standard wording. "Over the last 2 weeks, how often have you been bothered by the following problems?"
 *
 * Developed by Drs. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke and colleagues, with an educational grant from
 * Pfizer Inc. No permission is required to reproduce, translate, display or distribute them.
 *
 * PHQ-9 item 9 (index 8) is the safety item: any answer above zero marks the check-in for priority review.
 */
const SUB = "Over the last 2 weeks";

const phq9 = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself, or that you are a failure or have let yourself or your family down",
  "Trouble concentrating on things, such as reading or watching television",
  "Moving or speaking so slowly that other people could have noticed, or the opposite: being so fidgety or restless that you have been moving around a lot more than usual",
  "Thoughts that you would be better off dead, or of hurting yourself in some way",
];

const gad7 = [
  "Feeling nervous, anxious, or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it is hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid, as if something awful might happen",
];

export const FULL_QUESTIONS: ScreeningQuestion[] = [
  ...phq9.map((text, i) => ({
    id: `phq9-${i + 1}`,
    text,
    subtext: i === 8 ? "Confidential immediate safety screening item" : `${SUB} · Depression (PHQ-9)`,
    isCrisisItem: i === 8,
  })),
  ...gad7.map((text, i) => ({
    id: `gad7-${i + 1}`,
    text,
    subtext: `${SUB} · Anxiety (GAD-7)`,
    isCrisisItem: false,
  })),
];

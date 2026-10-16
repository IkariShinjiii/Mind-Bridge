/**
 * Published severity bands and screening cutoffs, for comparing the check-in with the instruments it is adapted from.
 * PHQ-9 (Kroenke, Spitzer & Williams, 2001) and GAD-7 (Spitzer et al., 2006) are free to use. Cutoffs follow the
 * published papers, as also collected in the MIT-licensed urtuba/psytools package (code not copied).
 */

export type Severity = "minimal" | "mild" | "moderate" | "moderately-severe" | "severe";

export interface Band {
  severity: Severity;
  label: string;
}

const LABELS: Readonly<Record<Severity, string>> = {
  minimal: "Minimal",
  mild: "Mild",
  moderate: "Moderate",
  "moderately-severe": "Moderately severe",
  severe: "Severe",
};

const band = (severity: Severity): Band => ({ severity, label: LABELS[severity] });

/** PHQ-9 (depression), score 0 to 27: 0-4 minimal, 5-9 mild, 10-14 moderate, 15-19 moderately severe, 20-27 severe. */
export function phq9Band(score: number): Band {
  if (score >= 20) return band("severe");
  if (score >= 15) return band("moderately-severe");
  if (score >= 10) return band("moderate");
  if (score >= 5) return band("mild");
  return band("minimal");
}

/** GAD-7 (anxiety), score 0 to 21: 0-4 minimal, 5-9 mild, 10-14 moderate, 15-21 severe. */
export function gad7Band(score: number): Band {
  if (score >= 15) return band("severe");
  if (score >= 10) return band("moderate");
  if (score >= 5) return band("mild");
  return band("minimal");
}

/**
 * Where each of the seven quick check-in questions comes from. Questions 4 and 5 are GAD-7 items 1 and 2 (the GAD-2),
 * 1 and 2 are PHQ-9 items 1 and 2 (the PHQ-2), 3 and 6 are PHQ-9 items 3 and 7, and 7 is PHQ-9 item 9.
 */
export const QUICK_SOURCE: ReadonlyArray<string> = [
  "PHQ-9 item 1",
  "PHQ-9 item 2",
  "PHQ-9 item 3",
  "GAD-7 item 1",
  "GAD-7 item 2",
  "PHQ-9 item 7",
  "PHQ-9 item 9",
];

/** Either two-question screen is positive from this score (0 to 6): the published cutoff for both PHQ-2 and GAD-2. */
export const TWO_ITEM_CUTOFF = 3;

export interface QuickScreen {
  phq2: number;
  gad2: number;
  phq2Positive: boolean;
  gad2Positive: boolean;
}

/** The seven quick check-in answers of a saved check-in, or null when it is some other shape. */
export function quickAnswersOf(a: {
  answers?: ReadonlyArray<number | null | undefined>;
  questionSummary?: ReadonlyArray<{ score?: number | null }>;
}): number[] | null {
  const fromAnswers = Array.isArray(a.answers) && a.answers.length === 7 ? a.answers : null;
  const fromSummary =
    Array.isArray(a.questionSummary) && a.questionSummary.length === 7 ? a.questionSummary.map((q) => q.score) : null;
  const source = fromAnswers ?? fromSummary;
  return source ? source.map((v) => Number(v) || 0) : null;
}

const val = (v: unknown): number => Number(v) || 0;

/** The PHQ-2 and GAD-2 inside a quick check-in (answers in question order). */
export function quickScreen(answers: ReadonlyArray<number | null | undefined>): QuickScreen {
  const phq2 = val(answers[0]) + val(answers[1]);
  const gad2 = val(answers[3]) + val(answers[4]);
  return { phq2, gad2, phq2Positive: phq2 >= TWO_ITEM_CUTOFF, gad2Positive: gad2 >= TWO_ITEM_CUTOFF };
}

/** The full check-in: PHQ-9 (9 questions) then GAD-7 (7 questions), 16 answers of 0 to 3. */
export const FULL_QUESTION_COUNT = 16;
export const PHQ9_COUNT = 9;

/** Severe enough to need priority follow-up: PHQ-9 moderately severe (15+) or GAD-7 severe (15+). */
export const HIGH_SCALE_CUTOFF = 15;
/** Moderate or worse on either scale (10+) is at least medium. */
export const MEDIUM_SCALE_CUTOFF = 10;

export interface FullResult {
  phq9: number;
  gad7: number;
  phq9Band: Band;
  gad7Band: Band;
  /** PHQ-9 item 9 (thoughts of death or self-harm) above zero. */
  safetyItem: boolean;
  /** What the published bands alone suggest; the percentage rule can still raise it. */
  level: "low" | "medium" | "high";
}

/** Scores the 16 full check-in answers on the two published scales. Items 1 to 9 are PHQ-9, 10 to 16 are GAD-7. */
export function scoreFull(answers: ReadonlyArray<number | string | null | undefined>): FullResult {
  const nums = Array.from({ length: FULL_QUESTION_COUNT }, (_, i) => val(answers[i]));
  const phq9 = nums.slice(0, PHQ9_COUNT).reduce((a, b) => a + b, 0);
  const gad7 = nums.slice(PHQ9_COUNT).reduce((a, b) => a + b, 0);
  const safetyItem = nums[PHQ9_COUNT - 1] > 0;
  // PHQ-2 is the first two PHQ-9 items; GAD-2 is the first two GAD-7 items (positions 10 and 11 here).
  const phq2Positive = nums[0] + nums[1] >= TWO_ITEM_CUTOFF;
  const gad2Positive = nums[PHQ9_COUNT] + nums[PHQ9_COUNT + 1] >= TWO_ITEM_CUTOFF;
  let level: FullResult["level"] = "low";
  if (safetyItem || phq9 >= HIGH_SCALE_CUTOFF || gad7 >= HIGH_SCALE_CUTOFF) level = "high";
  else if (phq9 >= MEDIUM_SCALE_CUTOFF || gad7 >= MEDIUM_SCALE_CUTOFF || phq2Positive || gad2Positive) level = "medium";
  return { phq9, gad7, phq9Band: phq9Band(phq9), gad7Band: gad7Band(gad7), safetyItem, level };
}

/** The 16 answers of a saved full check-in, or null when it is some other shape. */
export function fullAnswersOf(a: {
  answers?: ReadonlyArray<number | null | undefined>;
  questionSummary?: ReadonlyArray<{ score?: number | null }>;
}): number[] | null {
  const fromAnswers = Array.isArray(a.answers) && a.answers.length === FULL_QUESTION_COUNT ? a.answers : null;
  const fromSummary =
    Array.isArray(a.questionSummary) && a.questionSummary.length === FULL_QUESTION_COUNT
      ? a.questionSummary.map((q) => q.score)
      : null;
  const source = fromAnswers ?? fromSummary;
  return source ? source.map((v) => Number(v) || 0) : null;
}

/**
 * WHO-5 Well-Being Index (1998 version): five positively worded statements about the last two weeks, each answered
 * 0 (at no time) to 5 (all of the time). Raw score 0 to 25, multiplied by 4 for a percentage from 0 to 100. A
 * percentage below 50 (raw below 13) suggests low wellbeing and is the published prompt to look further.
 * Free to use. WHO-5 Well-Being Index, Psychiatric Research Unit, WHO Collaborating Centre for Mental Health,
 * Frederiksborg General Hospital, Hillerød, Denmark.
 */
export const WHO5_QUESTIONS: ReadonlyArray<string> = [
  "I have felt cheerful and in good spirits",
  "I have felt calm and relaxed",
  "I have felt active and vigorous",
  "I woke up feeling fresh and rested",
  "My daily life has been filled with things that interest me",
];

export const WHO5_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 5, label: "All of the time" },
  { value: 4, label: "Most of the time" },
  { value: 3, label: "More than half of the time" },
  { value: 2, label: "Less than half of the time" },
  { value: 1, label: "Some of the time" },
  { value: 0, label: "At no time" },
];

export const WHO5_LOW_BELOW = 50;

export interface Who5Result {
  raw: number;
  /** 0 to 100 */
  score: number;
  low: boolean;
}

/** Scores five WHO-5 answers (0 to 5 each). */
export function scoreWho5(answers: ReadonlyArray<number | null | undefined>): Who5Result {
  const raw = Array.from({ length: WHO5_QUESTIONS.length }, (_, i) => Math.min(5, Math.max(0, val(answers[i])))).reduce(
    (a, b) => a + b,
    0,
  );
  const score = raw * 4;
  return { raw, score, low: score < WHO5_LOW_BELOW };
}

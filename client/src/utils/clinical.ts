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

const val = (v: number | null | undefined): number => Number(v) || 0;

/** The PHQ-2 and GAD-2 inside a quick check-in (answers in question order). */
export function quickScreen(answers: ReadonlyArray<number | null | undefined>): QuickScreen {
  const phq2 = val(answers[0]) + val(answers[1]);
  const gad2 = val(answers[3]) + val(answers[4]);
  return { phq2, gad2, phq2Positive: phq2 >= TWO_ITEM_CUTOFF, gad2Positive: gad2 >= TWO_ITEM_CUTOFF };
}

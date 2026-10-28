import { fullAnswersOf, quickAnswersOf } from "./clinical";

/** Plain-language lines for the quick check-in, in question order. The last item (safety) has none on purpose. */
const QUICK_LINES: ReadonlyArray<string | null> = [
  "You are still finding interest in your daily activities.",
  "Your mood has not been weighing you down.",
  "You are sleeping reasonably well.",
  "You have not been feeling on edge.",
  "Worry has not been taking over.",
  "You can concentrate on your schoolwork.",
  null,
];

/** The full check-in: PHQ-9 items 1 to 8 (item 9 is the safety item and has none), then GAD-7 items 1 to 7. */
const FULL_LINES: ReadonlyArray<string | null> = [
  "You are still finding interest in the things you do.",
  "Your mood has not been weighing you down.",
  "You are sleeping reasonably well.",
  "You have steady energy.",
  "Your appetite has been steady.",
  "You feel okay about yourself.",
  "You can concentrate on what you are doing.",
  "You have not felt slowed down or restless.",
  null,
  "You have not felt nervous or on edge.",
  "You can set your worries aside.",
  "You are not worrying too much about different things.",
  "You are able to relax.",
  "You can sit still without feeling restless.",
  "You have not been easily annoyed.",
  "You have not felt afraid that something awful might happen.",
];

/**
 * What a student answered "not at all" to, said kindly: a short list of what is going well. Nothing is inferred or
 * stored; each line is just the opposite of a question answered 0. The safety item never appears. Unknown shapes give [].
 */
export function goingWell(
  a: {
    answers?: ReadonlyArray<number | null | undefined>;
    questionSummary?: ReadonlyArray<{ score?: number | null }>;
  },
  limit = 4,
): string[] {
  const quick = quickAnswersOf(a);
  const full = quick ? null : fullAnswersOf(a);
  const answers = quick ?? full;
  const lines = quick ? QUICK_LINES : FULL_LINES;
  if (!answers) return [];
  return answers.flatMap((v, i) => (v === 0 && lines[i] ? [lines[i] as string] : [])).slice(0, limit);
}

import type { Assessment } from "../types";

/**
 * Data factories for unit tests. Plain objects only: nothing here touches Firebase or the network, and nothing
 * is compiled into the app bundle (no app module imports this file).
 */

let seq = 0;
const nextId = (prefix: string): string => `${prefix}-${++seq}`;

/** Resets the id counter so a test file gets predictable ids. */
export function resetFactoryIds(): void {
  seq = 0;
}

/** Tiny seeded PRNG (mulberry32) so "random" tests are repeatable. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Builds a check-in. Pass `answers` and the question summary, total and max are derived; crisis item is the last quick question. */
export function makeAssessment(overrides: Partial<Assessment> & { answers?: Array<number | null> } = {}): Assessment {
  const answers = overrides.answers ?? [0, 0, 0, 0, 0, 0, 0];
  const total = answers.reduce<number>((s, v) => s + (Number(v) || 0), 0);
  const quick = answers.length === 7;
  return {
    id: nextId("assessment"),
    studentId: "uid-student",
    studentName: "Ana Student",
    studentEmail: "ana@usa.edu.ph",
    answers,
    questionSummary: answers.map((score, i) => ({
      id: `q${i + 1}`,
      text: `Question ${i + 1}`,
      score: Number(score) || 0,
      isCrisisItem: quick ? i === 6 : i === 8,
    })),
    total,
    maxScore: answers.length * 3,
    riskLevel: "low",
    flaggedForImmediateReview: false,
    status: "open",
    counselorNotes: "",
    createdAt: "2026-11-01T08:00:00.000Z",
    ...overrides,
  };
}

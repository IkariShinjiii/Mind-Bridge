import { z } from "zod";

/** Number of questions in the check-in. */
export const CHECKIN_QUESTION_COUNT = 7;

/** Number of questions in the optional full check-in (PHQ-9 then GAD-7). */
export const FULL_CHECKIN_QUESTION_COUNT = 16;

/** One answer: 0 (not at all) to 3 (nearly every day). */
export const checkInAnswerSchema = z
  .number({ error: "Answer every question." })
  .int("Answers must be whole numbers.")
  .min(0, "Answers go from 0 to 3.")
  .max(3, "Answers go from 0 to 3.");

/** A finished check-in: exactly one valid answer per question. */
export const checkInSchema = z.object({
  answers: z
    .array(checkInAnswerSchema)
    .length(CHECKIN_QUESTION_COUNT, `Answer all ${CHECKIN_QUESTION_COUNT} questions.`),
});
/** A finished full check-in: one valid answer for each of the 16 PHQ-9 and GAD-7 questions. */
export const fullCheckInSchema = z.object({
  answers: z
    .array(checkInAnswerSchema)
    .length(FULL_CHECKIN_QUESTION_COUNT, `Answer all ${FULL_CHECKIN_QUESTION_COUNT} questions.`),
});

export type CheckInInput = z.infer<typeof checkInSchema>;

/** Question definitions passed along with the answers when saving. */
export const screeningQuestionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  subtext: z.string(),
  isCrisisItem: z.boolean(),
});

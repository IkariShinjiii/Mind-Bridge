import { z } from "zod";

/** Number of WHO-5 statements. */
export const WELLBEING_QUESTION_COUNT = 5;

/** A finished WHO-5: one whole-number answer from 0 (at no time) to 5 (all of the time) per statement. */
export const wellbeingSchema = z.object({
  answers: z
    .array(
      z
        .number({ error: "Answer every statement." })
        .int("Answers must be whole numbers.")
        .min(0, "Answers go from 0 to 5.")
        .max(5, "Answers go from 0 to 5."),
    )
    .length(WELLBEING_QUESTION_COUNT, `Answer all ${WELLBEING_QUESTION_COUNT} statements.`),
});
export type WellbeingInput = z.infer<typeof wellbeingSchema>;

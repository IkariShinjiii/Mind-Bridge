import { z } from "zod";
import { optionalText } from "./fields";

/** Case status values a counselor can set. */
export const caseStatusSchema = z.enum(["open", "reviewed", "escalated"]);

/** Notes plus status on a student check-in. */
export const caseReviewSchema = z.object({
  id: z.string().min(1, "No case selected."),
  status: caseStatusSchema,
  counselorNotes: optionalText(2000),
});
export type CaseReviewInput = z.infer<typeof caseReviewSchema>;

/** Assigning (or clearing, with null) a counselor for a student. */
export const counselorAssignmentSchema = z.object({
  studentId: z.string().min(1, "No student selected."),
  counselorId: z.string().min(1).nullable(),
  counselorName: z.string().nullable(),
});
export type CounselorAssignmentInput = z.infer<typeof counselorAssignmentSchema>;

/** Approve / reject / deactivate / reactivate an account. */
export const accountActionSchema = z.object({ userId: z.string().min(1, "No account selected.") });

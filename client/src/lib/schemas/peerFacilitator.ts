import { z } from "zod";
import { FOLLOW_UP_PATTERN } from "../../utils/followUp";
import { optionalText } from "./fields";

/** Case status values a peer facilitator can set. */
export const caseStatusSchema = z.enum(["open", "reviewed", "escalated"]);

/** Notes plus status on a student check-in. */
export const caseReviewSchema = z.object({
  id: z.string().min(1, "No case selected."),
  status: caseStatusSchema,
  counselorNotes: optionalText(2000),
  /** "YYYY-MM-DD", or "" to clear. Leave out to keep the stored date. */
  followUpDate: z.string().regex(FOLLOW_UP_PATTERN, "Pick a valid follow-up date.").or(z.literal("")).optional(),
});
export type CaseReviewInput = z.infer<typeof caseReviewSchema>;

/** Assigning (or clearing, with null) a peer facilitator for a student. */
export const peerFacilitatorAssignmentSchema = z.object({
  studentId: z.string().min(1, "No student selected."),
  counselorId: z.string().min(1).nullable(),
  counselorName: z.string().nullable(),
});
export type PeerFacilitatorAssignmentInput = z.infer<typeof peerFacilitatorAssignmentSchema>;

/** Approve / reject / deactivate / reactivate an account. */
export const accountActionSchema = z.object({ userId: z.string().min(1, "No account selected.") });

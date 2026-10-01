import { z } from "zod";
import { dateTimeString, optionalText, requiredText } from "./fields";

/** A slot a student is booking. */
export const bookingSlotSchema = z
  .object({
    id: z.string().min(1, "Pick a time slot."),
    counselorId: z.string().min(1, "That slot has no counselor."),
    counselorName: z.string().optional(),
    start: dateTimeString("That slot has no start time."),
    end: dateTimeString("That slot has no end time."),
  })
  .superRefine((v, ctx) => {
    if (new Date(v.end) <= new Date(v.start)) {
      ctx.addIssue({ code: "custom", path: ["end"], message: "The end time must be after the start time." });
    }
  });
export type BookingSlotInput = z.infer<typeof bookingSlotSchema>;

/**
 * A time window typed into two datetime-local inputs (counselor availability, reschedule).
 * `now` is injectable so tests do not depend on the clock.
 */
export const timeWindowSchema = (now: Date = new Date()) =>
  z
    .object({
      start: dateTimeString("Choose a start time."),
      end: dateTimeString("Choose an end time."),
    })
    .superRefine((v, ctx) => {
      const s = new Date(v.start);
      const startOk = v.start !== "" && !Number.isNaN(s.getTime());
      if (startOk && s < now)
        ctx.addIssue({ code: "custom", path: ["start"], message: "The start time is in the past." });
      const e = new Date(v.end);
      const endOk = v.end !== "" && !Number.isNaN(e.getTime());
      if (startOk && s >= now && endOk && e <= s) {
        ctx.addIssue({ code: "custom", path: ["end"], message: "The end time must be after the start time." });
      }
    });

const REASON_MAX = 500;

/** Decline / cancel / reschedule dialog on the Appointments page. */
export const appointmentActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("decline"),
    reason: requiredText("Give the student a reason, or pick one of the quick reasons.", REASON_MAX),
  }),
  z.object({ type: z.literal("cancel"), reason: optionalText(REASON_MAX) }),
  z.object({
    type: z.literal("reschedule"),
    reason: optionalText(REASON_MAX),
    start: dateTimeString("Choose a start time."),
    end: z.preprocess((v) => v ?? "", z.string()),
  }),
]);
export type AppointmentActionInput = z.infer<typeof appointmentActionSchema>;

import { z } from "zod";
import { optionalPhone, optionalText, phone, requiredText } from "./fields";

/** Settings: profile tab. */
export const profileSchema = z.object({
  name: requiredText("Your name cannot be empty.", 80),
  phone: optionalPhone("Enter a valid phone number, or leave this blank."),
  bio: optionalText(500),
});
export type ProfileInput = z.infer<typeof profileSchema>;

/** Settings: emergency contact tab. Name and phone are required; the alternate phone is optional. */
export const emergencyContactSchema = z.object({
  name: requiredText("Enter the contact name."),
  relationship: z.string().optional(),
  phone: phone("Enter a phone number.", "Enter a valid phone number, like 0917 123 4567."),
  alternatePhone: optionalPhone("Enter a valid phone number, or leave this blank."),
  notes: optionalText(500).optional(),
});
export type EmergencyContactInput = z.infer<typeof emergencyContactSchema>;

/** Settings: wellness goals. */
export const MAX_GOALS = 5;
export const goalSchema = requiredText("Type a goal first.", 120);
export const goalsSchema = z.array(z.string().min(1).max(120)).max(MAX_GOALS, `You can pick up to ${MAX_GOALS} goals at a time.`);

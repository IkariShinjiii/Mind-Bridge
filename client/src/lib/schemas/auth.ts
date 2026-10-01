import { z } from "zod";
import { MIN_PASSWORD_LENGTH } from "../../utils/predicates";
import { loginEmail, newPassword, requiredText, schoolEmail } from "./fields";

const orEmpty = (v: unknown) => v ?? "";

/** Log-in form. The password is not length-checked: Firebase decides if it is right. */
export const loginSchema = z.object({
  email: loginEmail,
  password: z.preprocess(orEmpty, z.string().min(1, "Enter your password.")),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Student sign-up form. `consent` defaults to true when the form has no checkbox; an explicit false fails. */
export const signupSchema = z.object({
  name: requiredText("Enter your full name."),
  email: schoolEmail,
  password: newPassword,
  consent: z
    .preprocess((v) => (v === undefined ? true : v), z.unknown())
    .refine((v) => v === true, "You need to agree to continue."),
});
export type SignupInput = z.infer<typeof signupSchema>;

/** Change-password form (Settings). */
export const passwordChangeSchema = z
  .object({
    currentPassword: z.preprocess(orEmpty, z.string().min(1, "Enter your current password.")),
    newPassword: z.preprocess(
      orEmpty,
      z
        .string()
        .min(1, "Enter a new password.")
        .refine((v) => v === "" || v.length >= MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
    ),
    confirmPassword: z.preprocess(orEmpty, z.string().min(1, "Type the new password again.")),
  })
  .superRefine((v, ctx) => {
    if (v.newPassword.length >= MIN_PASSWORD_LENGTH && v.newPassword === v.currentPassword) {
      ctx.addIssue({ code: "custom", path: ["newPassword"], message: "Choose a password different from your current one." });
    }
    if (v.confirmPassword !== "" && v.confirmPassword !== v.newPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "The passwords do not match." });
    }
  });
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

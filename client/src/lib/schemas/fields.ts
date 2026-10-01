import { z } from "zod";
import { MIN_PASSWORD_LENGTH, SCHOOL_EMAIL_DOMAIN, isEmail, isPhone, isSchoolEmail } from "../../utils/predicates";

/**
 * Reusable field rules. Messages are written for students and double as the text shown under the field,
 * so they are part of the UI contract (the e2e suite asserts several of them).
 */

/** Treat missing values as empty so "required" messages show instead of "expected string". */
const orEmpty = (v: unknown) => (v === null || v === undefined ? "" : v);

/** Trimmed, non-empty text with a custom "required" message. */
export const requiredText = (message: string, max = 200) =>
  z.preprocess(orEmpty, z.string().trim().min(1, message).max(max, `Use at most ${max} characters.`));

/** Trimmed optional text; empty string is allowed. */
export const optionalText = (max: number) =>
  z.preprocess(orEmpty, z.string().trim().max(max, `Use at most ${max} characters.`));

export const loginEmail = z.preprocess(
  orEmpty,
  z
    .string()
    .trim()
    .min(1, "Enter your email.")
    .refine((v) => v === "" || isEmail(v), "That does not look like an email address."),
);

export const schoolEmail = z.preprocess(
  orEmpty,
  z
    .string()
    .trim()
    .min(1, "Enter your school email.")
    .refine(
      (v) => v === "" || isSchoolEmail(v),
      `Student registrations must use an ${SCHOOL_EMAIL_DOMAIN} email address.`,
    ),
);

/** A new password. Not trimmed: spaces count as characters. */
export const newPassword = z.preprocess(
  orEmpty,
  z
    .string()
    .min(1, "Choose a password.")
    .refine(
      (v) => v === "" || v.length >= MIN_PASSWORD_LENGTH,
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    ),
);

export const phone = (requiredMessage: string, invalidMessage: string) =>
  z.preprocess(
    orEmpty,
    z
      .string()
      .trim()
      .min(1, requiredMessage)
      .refine((v) => v === "" || isPhone(v), invalidMessage),
  );

/** A phone number that may be left blank. */
export const optionalPhone = (invalidMessage: string) =>
  z.preprocess(
    orEmpty,
    z
      .string()
      .trim()
      .refine((v) => v === "" || isPhone(v), invalidMessage),
  );

/** A date/time the form gave us as a string; must parse. */
export const dateTimeString = (message: string) =>
  z.preprocess(
    orEmpty,
    z
      .string()
      .min(1, message)
      .refine((v) => v === "" || !Number.isNaN(new Date(v).getTime()), message),
  );

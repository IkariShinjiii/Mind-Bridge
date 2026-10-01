import { fieldErrorsOf } from "../lib/validate";
import {
  emergencyContactSchema,
  loginSchema,
  passwordChangeSchema,
  signupSchema,
  timeWindowSchema,
} from "../lib/schemas";
import type { FieldErrors } from "../types";

export { SCHOOL_EMAIL_DOMAIN, MIN_PASSWORD_LENGTH, isEmail, isSchoolEmail, isPhone } from "./predicates";

/** Raw values as read from a form: any field may be missing or not a string. */
type Raw<K extends string> = Partial<Record<K, unknown>>;

/** Validates the sign-up form. Returns `{ field: message }`; empty when valid. */
export function validateSignup(values: Raw<"name" | "email" | "password" | "consent">): FieldErrors {
  return fieldErrorsOf(signupSchema, values);
}

/** Validates the log-in form. Returns `{ field: message }`; empty when valid. */
export function validateLogin(values: Raw<"email" | "password">): FieldErrors {
  return fieldErrorsOf(loginSchema, values);
}

/** Validates the emergency contact form. Name and phone are required; the alternate phone is optional. */
export function validateEmergencyContact(values: Raw<"name" | "phone" | "alternatePhone">): FieldErrors {
  return fieldErrorsOf(emergencyContactSchema, values);
}

/** Validates a change-password form. */
export function validatePasswordChange(
  values: Raw<"currentPassword" | "newPassword" | "confirmPassword">,
): FieldErrors {
  return fieldErrorsOf(passwordChangeSchema, values);
}

/**
 * Validates a counselor availability window (start in the future, end after start).
 * @param start - datetime-local value
 * @param end - datetime-local value
 * @param now - current time, injectable for tests
 */
export function validateAvailabilityWindow(start?: unknown, end?: unknown, now: Date = new Date()): FieldErrors {
  return fieldErrorsOf(timeWindowSchema(now), { start, end });
}

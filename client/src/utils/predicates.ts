/** School email domain required for student accounts. */
export const SCHOOL_EMAIL_DOMAIN = "@usa.edu.ph";
/** Minimum password length enforced by Firebase Auth. */
export const MIN_PASSWORD_LENGTH = 6;

/**
 * Returns true when the value looks like an email address (one @, a dot in the domain, no spaces).
 * Accepts any input so form code can pass raw field values; non-strings are rejected.
 */
export function isEmail(value: unknown): boolean {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Returns true for a school email address (case-insensitive, surrounding spaces ignored). */
export function isSchoolEmail(value: unknown): boolean {
  return isEmail(value) && (value as string).trim().toLowerCase().endsWith(SCHOOL_EMAIL_DOMAIN);
}

/**
 * Returns true for a Philippine-style phone number: 7 to 13 digits, optionally with +, spaces, dashes,
 * dots or parentheses. Counts digits, not characters.
 */
export function isPhone(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!/^[+\d(][\d\s().-]*$/.test(v)) return false;
  const digits = v.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 13;
}

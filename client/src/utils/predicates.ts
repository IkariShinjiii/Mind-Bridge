/** School email domain required for student accounts. */
export const SCHOOL_EMAIL_DOMAIN = "@usa.edu.ph";
/** Minimum password length enforced by Firebase Auth. */
export const MIN_PASSWORD_LENGTH = 6;

export type PasswordLevel = 0 | 1 | 2 | 3 | 4;

/**
 * Rates a password for the sign-up strength meter. Advice only: the hard rule is MIN_PASSWORD_LENGTH.
 * Points for length (8+, 12+), mixed case, a digit and a symbol, capped at 4. Level 0 means nothing typed yet.
 */
export function passwordStrength(password: string): { level: PasswordLevel; label: string } {
  const value = String(password || "");
  if (!value) return { level: 0, label: "" };
  let points = 0;
  if (value.length >= 8) points += 1;
  if (value.length >= 12) points += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) points += 1;
  if (/\d/.test(value)) points += 1;
  if (/[^A-Za-z0-9]/.test(value)) points += 1;
  // Under the minimum length is always the weakest rating, however varied the characters are.
  const level = (value.length < MIN_PASSWORD_LENGTH ? 1 : Math.min(4, Math.max(1, points))) as PasswordLevel;
  return { level, label: ["", "Weak", "Fair", "Good", "Strong"][level] ?? "" };
}

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

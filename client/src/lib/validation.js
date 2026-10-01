/** School email domain required for student accounts. */
export const SCHOOL_EMAIL_DOMAIN = "@usa.edu.ph";
/** Minimum password length enforced by Firebase Auth. */
export const MIN_PASSWORD_LENGTH = 6;

/**
 * Returns true when the string looks like an email address (one @, a dot in the domain, no spaces).
 * @param {string} value
 * @returns {boolean}
 */
export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

/**
 * Returns true for a school email address.
 * @param {string} value
 * @returns {boolean}
 */
export function isSchoolEmail(value) {
  return isEmail(value) && String(value).trim().toLowerCase().endsWith(SCHOOL_EMAIL_DOMAIN);
}

/**
 * Returns true for a Philippine-style phone number: 7 to 13 digits, optionally with +, spaces, dashes,
 * dots or parentheses.
 * @param {string} value
 * @returns {boolean}
 */
export function isPhone(value) {
  const v = String(value || "").trim();
  if (!/^[+\d(][\d\s().-]*$/.test(v)) return false;
  const digits = v.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 13;
}

/**
 * Validates the sign-up form. Returns an object of field name to message; empty when valid.
 * @param {{ name: string, email: string, password: string, consent?: boolean }} values
 * @returns {Record<string, string>}
 */
export function validateSignup({ name, email, password, consent = true }) {
  const errors = {};
  if (!String(name || "").trim()) errors.name = "Enter your full name.";
  if (!String(email || "").trim()) errors.email = "Enter your school email.";
  else if (!isSchoolEmail(email)) errors.email = `Student registrations must use an ${SCHOOL_EMAIL_DOMAIN} email address.`;
  if (!password) errors.password = "Choose a password.";
  else if (password.length < MIN_PASSWORD_LENGTH) errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (!consent) errors.consent = "You need to agree to continue.";
  return errors;
}

/**
 * Validates the log-in form. Returns an object of field name to message; empty when valid.
 * @param {{ email: string, password: string }} values
 * @returns {Record<string, string>}
 */
export function validateLogin({ email, password }) {
  const errors = {};
  if (!String(email || "").trim()) errors.email = "Enter your email.";
  else if (!isEmail(email)) errors.email = "That does not look like an email address.";
  if (!password) errors.password = "Enter your password.";
  return errors;
}

/**
 * Validates the emergency contact form. Name and phone are required; the alternate phone is optional.
 * @param {{ name: string, phone: string, alternatePhone?: string }} values
 * @returns {Record<string, string>}
 */
export function validateEmergencyContact({ name, phone, alternatePhone }) {
  const errors = {};
  if (!String(name || "").trim()) errors.name = "Enter the contact name.";
  if (!String(phone || "").trim()) errors.phone = "Enter a phone number.";
  else if (!isPhone(phone)) errors.phone = "Enter a valid phone number, like 0917 123 4567.";
  if (String(alternatePhone || "").trim() && !isPhone(alternatePhone)) {
    errors.alternatePhone = "Enter a valid phone number, or leave this blank.";
  }
  return errors;
}

/**
 * Validates a change-password form.
 * @param {{ currentPassword: string, newPassword: string, confirmPassword: string }} values
 * @returns {Record<string, string>}
 */
export function validatePasswordChange({ currentPassword, newPassword, confirmPassword }) {
  const errors = {};
  if (!currentPassword) errors.currentPassword = "Enter your current password.";
  if (!newPassword) errors.newPassword = "Enter a new password.";
  else if (newPassword.length < MIN_PASSWORD_LENGTH) errors.newPassword = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  else if (newPassword === currentPassword) errors.newPassword = "Choose a password different from your current one.";
  if (!confirmPassword) errors.confirmPassword = "Type the new password again.";
  else if (confirmPassword !== newPassword) errors.confirmPassword = "The passwords do not match.";
  return errors;
}

/**
 * Validates a counselor availability window.
 * @param {string} start - datetime-local value
 * @param {string} end - datetime-local value
 * @param {Date} [now] - current time, injectable for tests
 * @returns {Record<string, string>}
 */
export function validateAvailabilityWindow(start, end, now = new Date()) {
  const errors = {};
  const s = new Date(start);
  const e = new Date(end);
  if (!start || Number.isNaN(s.getTime())) errors.start = "Choose a start time.";
  else if (s < now) errors.start = "The start time is in the past.";
  if (!end || Number.isNaN(e.getTime())) errors.end = "Choose an end time.";
  else if (!errors.start && e <= s) errors.end = "The end time must be after the start time.";
  return errors;
}

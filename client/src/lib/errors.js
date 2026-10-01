const AUTH_MESSAGES = {
  "auth/invalid-credential": "That email and password do not match. Check them and try again.",
  "auth/wrong-password": "That email and password do not match. Check them and try again.",
  "auth/user-not-found": "That email and password do not match. Check them and try again.",
  "auth/invalid-email": "That does not look like a valid email address.",
  "auth/user-disabled": "This account has been deactivated. Contact an administrator.",
  "auth/email-already-in-use": "An account with that email already exists. Try logging in instead.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes, then try again.",
  "auth/network-request-failed": "No connection. Check your internet and try again.",
  "auth/requires-recent-login": "For your security, log in again before making this change.",
  "auth/popup-blocked": "Your browser blocked the Google sign-in window. Allow pop-ups and try again.",
  "permission-denied": "You do not have permission to do that.",
  unavailable: "The service is unreachable right now. Check your connection and try again.",
};

/**
 * Turns a Firebase (or generic) error into a sentence a student can act on.
 * Raw error codes and stack text are never shown.
 * @param {unknown} error
 * @param {string} [fallback] - used when the error is not recognised
 * @returns {string}
 */
export function friendlyError(error, fallback = "Something went wrong. Please try again.") {
  const code = error && typeof error === "object" ? error.code : undefined;
  if (!code) return fallback;
  return AUTH_MESSAGES[code] || AUTH_MESSAGES[String(code).replace(/^firestore\//, "")] || fallback;
}

/**
 * True for errors that mean the user simply dismissed a sign-in popup.
 * @param {unknown} error
 * @returns {boolean}
 */
export function isPopupDismissed(error) {
  const code = error && typeof error === "object" ? error.code : undefined;
  return code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request";
}

import type { AppErrorShape, ErrorCode } from "../types";

const GENERIC = "Something went wrong. Please try again.";

const AUTH_MESSAGES: Readonly<Record<string, string>> = {
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

/** Maps an SDK error code to the app-level code the UI switches on. */
const CODE_MAP: Readonly<Record<string, ErrorCode>> = {
  "auth/invalid-credential": "unauthenticated",
  "auth/wrong-password": "unauthenticated",
  "auth/user-not-found": "unauthenticated",
  "auth/requires-recent-login": "unauthenticated",
  "auth/invalid-email": "validation",
  "auth/weak-password": "validation",
  "auth/user-disabled": "permission-denied",
  "permission-denied": "permission-denied",
  "auth/email-already-in-use": "conflict",
  "already-exists": "conflict",
  "not-found": "not-found",
  "auth/too-many-requests": "rate-limited",
  "resource-exhausted": "rate-limited",
  "auth/network-request-failed": "network",
  unavailable: "network",
};

/** Reads `.code` from anything error-shaped, as a string; undefined when absent or empty. */
export function codeOf(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  const code = (error as { code: unknown }).code;
  if (code === undefined || code === null || code === "" || code === 0) return undefined;
  return String(code);
}

/** Looks up a user-facing message for an SDK code ("firestore/" prefix ignored); own keys only. */
function messageForCode(code: string | undefined): string | undefined {
  if (!code) return undefined;
  const bare = code.replace(/^firestore\//, "");
  if (Object.hasOwn(AUTH_MESSAGES, code)) return AUTH_MESSAGES[code];
  if (Object.hasOwn(AUTH_MESSAGES, bare)) return AUTH_MESSAGES[bare];
  return undefined;
}

/**
 * Standard error thrown by the data layer (`lib/api.ts`) and understood by every screen.
 * `code` is the app-level reason, `userMessage` is safe to show, `message` is for logs.
 */
export class AppError extends Error implements AppErrorShape {
  readonly code: ErrorCode;
  readonly sourceCode?: string;
  readonly userMessage: string;
  readonly fieldErrors?: Record<string, string>;

  constructor(
    code: ErrorCode,
    userMessage: string,
    options: { message?: string; sourceCode?: string; fieldErrors?: Record<string, string>; cause?: unknown } = {}
  ) {
    super(options.message ?? userMessage, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.userMessage = userMessage;
    if (options.sourceCode !== undefined) this.sourceCode = options.sourceCode;
    if (options.fieldErrors !== undefined) this.fieldErrors = options.fieldErrors;
  }
}

/**
 * Converts anything that was thrown into an `AppError`, keeping the original as `cause`.
 * Unknown errors get the generic message so raw SDK text never reaches the screen.
 */
export function toAppError(error: unknown, fallback: string = GENERIC): AppError {
  if (error instanceof AppError) return error;
  const sourceCode = codeOf(error);
  const code = (sourceCode && CODE_MAP[sourceCode.replace(/^firestore\//, "")]) || "unknown";
  const technical = error instanceof Error ? error.message : typeof error === "string" ? error : undefined;
  return new AppError(code, messageForCode(sourceCode) ?? fallback, {
    ...(technical !== undefined ? { message: technical } : {}),
    ...(sourceCode !== undefined ? { sourceCode } : {}),
    cause: error,
  });
}

/**
 * Turns a Firebase (or generic) error into a sentence a student can act on.
 * Raw error codes and stack text are never shown.
 * @param error - anything that was thrown
 * @param fallback - used when the error is not recognised
 */
export function friendlyError(error: unknown, fallback: string = GENERIC): string {
  if (error instanceof AppError) return error.userMessage === GENERIC ? fallback : error.userMessage;
  return messageForCode(codeOf(error)) ?? fallback;
}

/** True for errors that mean the user simply dismissed a sign-in popup. */
export function isPopupDismissed(error: unknown): boolean {
  const code = codeOf(error);
  return code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request";
}

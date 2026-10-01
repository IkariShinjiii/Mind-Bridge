/** Machine-readable reason an operation failed. Keep this list short; add a code only when the UI reacts to it. */
export type ErrorCode =
  | "validation"
  | "unauthenticated"
  | "permission-denied"
  | "not-found"
  | "conflict"
  | "network"
  | "rate-limited"
  | "unknown";

/**
 * The one error shape the UI deals with.
 * - `userMessage` is written for students and is the only text ever rendered.
 * - `message` is the technical text for logs and tests; never render it.
 */
export interface AppErrorShape {
  code: ErrorCode;
  /** Original Firebase/SDK code, e.g. "auth/invalid-credential". */
  sourceCode?: string;
  message: string;
  userMessage: string;
  /** Field name to message, for `validation` errors. */
  fieldErrors?: Record<string, string>;
}

/** Result of an operation that can fail without throwing (form validation, parsing). */
export type Result<T, E = AppErrorShape> = { ok: true; data: T } | { ok: false; error: E };

/** Field name to message; empty object means valid. Used by every form. */
export type FieldErrors = Record<string, string>;

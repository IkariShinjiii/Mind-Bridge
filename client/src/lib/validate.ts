import type { z } from "zod";
import type { FieldErrors, Result } from "../types";

/**
 * Collapses a Zod error into `{ field: message }`, keeping the first message per field
 * (nested paths are joined with dots, e.g. "answers.3").
 */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.map(String).join(".") : "_form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/**
 * Validates `input` against a schema without throwing.
 * On success `data` is the parsed (trimmed, defaulted) value; on failure the error uses the standard
 * `validation` shape with a per-field message map.
 */
export function validate<S extends z.ZodType>(schema: S, input: unknown): Result<z.output<S>> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  const fieldErrors = toFieldErrors(parsed.error);
  const message = Object.values(fieldErrors)[0] ?? "Check the form and try again.";
  return { ok: false, error: { code: "validation", message, userMessage: message, fieldErrors } };
}

/** Like `validate` but returns only the field-to-message map ({} when valid). Handy for form state. */
export function fieldErrorsOf(schema: z.ZodType, input: unknown): FieldErrors {
  const result = validate(schema, input);
  return result.ok ? {} : (result.error.fieldErrors ?? {});
}

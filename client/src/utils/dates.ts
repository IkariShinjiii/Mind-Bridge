import type { StoredDate } from "../types";

/**
 * Parses a stored date.
 * @returns null when the value is missing or not a valid date
 */
export function parseDate(value: StoredDate): Date | null {
  if (!value) return null;
  const d = toDate(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Converts any stored date (ISO string, millisecond number, Date, Firestore Timestamp) to a Date.
 * The result may be an Invalid Date; check with `Number.isNaN(d.getTime())`.
 */
export function toDate(value: StoredDate): Date {
  if (value instanceof Date) return value;
  if (value !== null && typeof value === "object") return value.toDate();
  return new Date(value as string | number);
}

/**
 * Formats a date for an `<input type="datetime-local">` in the viewer's local time zone.
 * (`toISOString().slice(0, 16)` is UTC and shows the wrong hour for anyone not on UTC.)
 * @param {string|number|Date} value
 * @returns {string} "YYYY-MM-DDTHH:mm", or "" when the value is not a valid date
 */
export function toLocalInputValue(value: StoredDate): string {
  const d = toDate(value);
  if (!value || Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Formats a stored date for display, e.g. "Oct 2, 2026, 9:30 AM". Free-text values that are not
 * dates are returned unchanged.
 * @param {string|number|Date} value
 * @param {string} [empty] - text for a missing value
 * @returns {string}
 */
export function formatDateTime(value: StoredDate, empty = "Not specified"): string {
  if (!value) return empty;
  if (typeof value === "string" && !value.includes("-") && !value.includes("/")) return value;
  const d = toDate(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

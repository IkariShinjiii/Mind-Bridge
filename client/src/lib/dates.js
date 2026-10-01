const pad = (n) => String(n).padStart(2, "0");

/**
 * Formats a date for an `<input type="datetime-local">` in the viewer's local time zone.
 * (`toISOString().slice(0, 16)` is UTC and shows the wrong hour for anyone not on UTC.)
 * @param {string|number|Date} value
 * @returns {string} "YYYY-MM-DDTHH:mm", or "" when the value is not a valid date
 */
export function toLocalInputValue(value) {
  const d = value instanceof Date ? value : new Date(value);
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
export function formatDateTime(value, empty = "Not specified") {
  if (!value) return empty;
  if (typeof value === "string" && !value.includes("-") && !value.includes("/")) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

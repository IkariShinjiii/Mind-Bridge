import type { CaseStatus } from "../types";

/** A case's follow-up date is a calendar day with no time, "YYYY-MM-DD", or "" when none is set. */
export const FOLLOW_UP_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type FollowUpState = "overdue" | "today" | "upcoming";

const pad = (n: number) => String(n).padStart(2, "0");

/** Today's date in the viewer's local time zone, as "YYYY-MM-DD". */
export function todayKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Where a case's follow-up stands today. A reviewed case needs nothing more, so it has no state.
 * @returns null when there is no valid date or the case is reviewed
 */
export function followUpState(
  date: string | undefined,
  status: CaseStatus | undefined,
  now: Date = new Date(),
): FollowUpState | null {
  if (!date || !FOLLOW_UP_PATTERN.test(date) || status === "reviewed") return null;
  const today = todayKey(now);
  // Same-length ISO dates compare correctly as plain strings.
  if (date < today) return "overdue";
  return date === today ? "today" : "upcoming";
}

/** "Oct 28" style label for a follow-up date, without shifting the day across time zones. */
export function formatFollowUp(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** One check-in on the trend chart. */
export interface TrendPoint {
  score: number;
  max: number;
  /** ISO date string. */
  date?: string;
}

export interface TrendSummary {
  count: number;
  latest: number;
  max: number;
  /** Latest minus the check-in before it; null with a single check-in. */
  change: number | null;
  direction: "lower" | "higher" | "same" | null;
  /** Mean score, one decimal place. */
  average: number;
  /** The lowest (best) score so far. */
  lowest: number;
  /** Whole days since the latest check-in, relative to `now`; null when its date is missing. */
  daysAgo: number | null;
}

/** Highest score of the low band and of the medium band for a check-in out of `max` (same 30% and 60% rule as scoring). */
export function bandLimits(max: number): { lowTop: number; mediumTop: number } {
  return { lowTop: Math.ceil(max * 0.3) - 1, mediumTop: Math.ceil(max * 0.6) - 1 };
}

/** Facts about a student's check-ins, oldest to newest, all out of the same maximum. Null when there are none. */
export function summarizeTrend(points: ReadonlyArray<TrendPoint>, now: Date = new Date()): TrendSummary | null {
  if (points.length === 0) return null;
  const latest = points[points.length - 1];
  const previous = points.length > 1 ? points[points.length - 2] : null;
  const change = previous ? latest.score - previous.score : null;
  const scores = points.map((p) => p.score);
  const average = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  const time = latest.date ? new Date(latest.date).getTime() : NaN;
  return {
    count: points.length,
    latest: latest.score,
    max: latest.max,
    change,
    direction: change === null ? null : change < 0 ? "lower" : change > 0 ? "higher" : "same",
    average,
    lowest: Math.min(...scores),
    daysAgo: Number.isFinite(time) ? Math.max(0, Math.floor((now.getTime() - time) / 86_400_000)) : null,
  };
}

/** Plain-language sentence for the summary, in the student's terms (a lower score means fewer difficulties). */
export function describeChange(s: TrendSummary): string {
  if (s.change === null) return "This is your first check-in. A comparison appears after your next one.";
  const pts = Math.abs(s.change);
  const unit = pts === 1 ? "point" : "points";
  if (s.direction === "lower") return `${pts} ${unit} lower than your last check-in. Fewer difficulties this time.`;
  if (s.direction === "higher") return `${pts} ${unit} higher than your last check-in. Things have felt harder lately.`;
  return "Same as your last check-in.";
}

/** The check-in questions cover the last two weeks, so a gentle nudge starts once the latest one is that old. */
export const NUDGE_AFTER_DAYS = 14;

/** A calm nudge to check in again, or null when the latest check-in is recent (or its date is unknown). */
export function checkInNudge(daysAgo: number | null): string | null {
  if (daysAgo === null || daysAgo < NUDGE_AFTER_DAYS) return null;
  const weeks = Math.floor(daysAgo / 7);
  return `Your last check-in was ${weeks} ${weeks === 1 ? "week" : "weeks"} ago. A new one takes about a minute whenever you are ready.`;
}

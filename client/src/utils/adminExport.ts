import type { Assessment, StoredDate } from "../types";
import { toDate } from "./dates";

/** The fields of an assessment that end up in the compliance CSV. */
export type CsvAssessment = Partial<Pick<Assessment, "riskLevel" | "status" | "total" | "createdAt" | "submittedAt" | "reviewedAt">>;

/** Tailwind classes for a risk-level badge, keyed by "high" | "medium" | "low". */
export const RISK_STYLES = {
  high: "bg-[color:var(--mb-urgent-bg)] text-[color:var(--mb-urgent)] border-[color:var(--mb-urgent)]",
  medium: "bg-[color:var(--mb-warn-bg)] text-[color:var(--mb-warn)] border-[color:var(--mb-warn)]",
  low: "bg-[color:var(--mb-safe-bg)] text-[color:var(--mb-safe)] border-[color:var(--mb-safe)]",
};

/** Tailwind classes for a case-status badge, keyed by "open" | "reviewed" | "escalated". */
export const STATUS_STYLES = {
  open: "bg-[color:var(--mb-surface-2)] text-[color:var(--mb-muted)] border-[color:var(--mb-line)]",
  reviewed: "bg-[color:var(--mb-safe-bg)] text-[color:var(--mb-safe)] border-[color:var(--mb-safe)]",
  escalated: "bg-[color:var(--mb-urgent-bg)] text-[color:var(--mb-urgent)] border-[color:var(--mb-urgent)]",
};

/** Tailwind classes for an account-role badge, keyed by "student" | "counselor" | "admin". */
export const ROLE_BADGE = {
  student: "bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-brand)] border-[color:var(--mb-brand)]",
  counselor: "bg-[color:var(--mb-warn-bg)] text-[color:var(--mb-warn)] border-[color:var(--mb-warn)]",
  admin: "bg-[color:var(--mb-violet-bg)] text-[color:var(--mb-violet)] border-[color:var(--mb-violet)]",
};

// Low, medium, high. CSS variables so the chart follows the light/dark theme.
export const CHART_COLORS = ["var(--mb-safe)", "var(--mb-warn)", "var(--mb-urgent)"];

/**
 * Formats a stored date for the staff tables. Missing values show an em dash; unparseable values are
 * returned as given.
 * @param {string|number|Date} value
 * @returns {string}
 */
export const formatDateTime = (value: StoredDate): string => {
  if (!value) return "—";
  const date = toDate(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

/**
 * Downloads an anonymised compliance report as CSV. Student names and emails are replaced by
 * sequential ids (ST-0001, ...); only risk level, status, score and dates are exported.
 * @param {Array<{ riskLevel?: string, status?: string, total?: number, createdAt?: string, submittedAt?: string, reviewedAt?: string }>} assessments
 * @returns {void}
 */
export function downloadAssessmentsCsv(assessments: ReadonlyArray<CsvAssessment>): void {
  const headers = ["student_id", "risk_level", "status", "score", "created_at", "reviewed_at"] as const;
  const rows: Array<Record<(typeof headers)[number], string | number>> = assessments.length
    ? assessments.map((item, index) => ({
        student_id: `ST-${String(index + 1).padStart(4, "0")}`,
        risk_level: String(item.riskLevel || "low").toLowerCase(),
        status: item.status || "open",
        score: typeof item.total === "number" && Number.isFinite(item.total) ? item.total : "n/a",
        created_at: item.createdAt || item.submittedAt || "",
        reviewed_at: item.reviewedAt || "",
      }))
    : [{ student_id: "ST-0000", risk_level: "low", status: "n/a", score: "n/a", created_at: "", reviewed_at: "" }];

  const csv = [
    headers,
    ...rows.map((row) => headers.map((key) => `"${String(row[key]).replace(/"/g, '""')}"`)),
  ]
    .map((line) => line.join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mindbridge-compliance-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

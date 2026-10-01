export const RISK_STYLES = {
  high: "bg-[color:var(--mb-urgent-bg)] text-[color:var(--mb-urgent)] border-[color:var(--mb-urgent)]",
  medium: "bg-[color:var(--mb-warn-bg)] text-[color:var(--mb-warn)] border-[color:var(--mb-warn)]",
  low: "bg-[color:var(--mb-safe-bg)] text-[color:var(--mb-safe)] border-[color:var(--mb-safe)]",
};

export const STATUS_STYLES = {
  open: "bg-[color:var(--mb-surface-2)] text-[color:var(--mb-muted)] border-[color:var(--mb-line)]",
  reviewed: "bg-[color:var(--mb-safe-bg)] text-[color:var(--mb-safe)] border-[color:var(--mb-safe)]",
  escalated: "bg-[color:var(--mb-urgent-bg)] text-[color:var(--mb-urgent)] border-[color:var(--mb-urgent)]",
};

export const ROLE_BADGE = {
  student: "bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-brand)] border-[color:var(--mb-brand)]",
  counselor: "bg-[color:var(--mb-warn-bg)] text-[color:var(--mb-warn)] border-[color:var(--mb-warn)]",
  admin: "bg-[color:var(--mb-violet-bg)] text-[color:var(--mb-violet)] border-[color:var(--mb-violet)]",
};

// Low, medium, high. CSS variables so the chart follows the light/dark theme.
export const CHART_COLORS = ["var(--mb-safe)", "var(--mb-warn)", "var(--mb-urgent)"];

export const defaultAuditLogs = [
  {
    id: "system-seed-1",
    actor: "System",
    action: "Nightly compliance sync",
    target: "Wellness program",
    timestamp: new Date().toISOString(),
    outcome: "Completed",
  },
  {
    id: "system-seed-2",
    actor: "Staff Admin",
    action: "Reviewed counselor onboarding",
    target: "Staff approvals",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    outcome: "Approved",
  },
  {
    id: "system-seed-3",
    actor: "Staff Admin",
    action: "Escalated high-risk assessment",
    target: "Student support queue",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    outcome: "Flagged",
  },
];

export const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export function buildAuditLogs(allUsers, assessmentData) {
  const entries = [];

  allUsers.slice(0, 4).forEach((user) => {
    entries.push({
      id: `user-${user.id}`,
      actor: "Staff Admin",
      action: user.active === false ? "Account deactivation reviewed" : "User access reviewed",
      target: user.name || user.email || "System account",
      timestamp: new Date().toISOString(),
      outcome: user.active === false ? "Deactivated" : "Verified",
    });
  });

  if (Array.isArray(assessmentData)) {
    assessmentData.slice(0, 5).forEach((assessment, index) => {
      entries.push({
        id: `assessment-${assessment.id || index}`,
        actor: "Staff Admin",
        action: "Assessment reviewed",
        target: `Case ${String(index + 1).padStart(3, "0")}`,
        timestamp: assessment.reviewedAt || assessment.createdAt || new Date().toISOString(),
        outcome: assessment.status || "Open",
      });
    });
  }

  return entries.length > 0 ? entries : defaultAuditLogs;
}

export function downloadAssessmentsCsv(assessments) {
  const rows = assessments.length
    ? assessments.map((item, index) => ({
        student_id: `ST-${String(index + 1).padStart(4, "0")}`,
        risk_level: String(item.riskLevel || "low").toLowerCase(),
        status: item.status || "open",
        score: Number.isFinite(item.total) ? item.total : "n/a",
        created_at: item.createdAt || item.submittedAt || "",
        reviewed_at: item.reviewedAt || "",
      }))
    : [{ student_id: "ST-0000", risk_level: "low", status: "n/a", score: "n/a", created_at: "", reviewed_at: "" }];

  const headers = ["student_id", "risk_level", "status", "score", "created_at", "reviewed_at"];
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

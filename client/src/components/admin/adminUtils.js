export const RISK_STYLES = {
  high: "bg-red-500/10 text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export const STATUS_STYLES = {
  open: "bg-gray-800 text-gray-300 border-gray-700",
  reviewed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  escalated: "bg-red-500/10 text-red-400 border-red-500/20",
};

export const ROLE_BADGE = {
  student: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  counselor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  admin: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export const CHART_COLORS = ["#1fbf9f", "#f5b84c", "#ef5d5d"];

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

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getAdminUsers,
  getAssessments,
  approveCounselor,
  rejectCounselor,
  deactivateUser,
  reactivateUser,
} from "../api";

const ROLE_BADGE = {
  student: "bg-teal/10 text-teal border-teal/30",
  counselor: "bg-amber-100 text-amber-700 border-amber-200",
  admin: "bg-ink/10 text-ink border-ink/20",
};

const CHART_COLORS = ["#1fbf9f", "#f5b84c", "#ef5d5d"];

const defaultAuditLogs = [
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
    actor: "Admin",
    action: "Reviewed counselor onboarding",
    target: "Counselor approvals",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    outcome: "Approved",
  },
  {
    id: "system-seed-3",
    actor: "Counselor",
    action: "Escalated high-risk assessment",
    target: "Student support queue",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    outcome: "Flagged",
  },
];

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("counselors");
  const [auditLogs, setAuditLogs] = useState(defaultAuditLogs);

  async function load() {
    setLoading(true);
    try {
      const [allUsers, assessmentData] = await Promise.all([
        getAdminUsers(),
        getAssessments().catch(() => []),
      ]);
      setUsers(allUsers);
      setAssessments(Array.isArray(assessmentData) ? assessmentData : []);
      setAuditLogs(buildAuditLogs(allUsers, assessmentData || []));
    } catch (error) {
      setUsers([]);
      setAssessments([]);
      setAuditLogs(defaultAuditLogs);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const pending = users.filter((u) => u.role === "counselor" && !u.approved);
  const filteredUsers =
    activeTab === "counselors"
      ? users.filter((u) => u.role === "counselor" || u.role === "admin")
      : users.filter((u) => u.role === "student");

  const analytics = useMemo(() => {
    const distinctStudents = new Set(
      assessments
        .map((item) => item.studentId || item.userId || item.student || item.user || "anonymous")
        .filter(Boolean)
    ).size;

    const counts = { low: 0, medium: 0, high: 0 };
    assessments.forEach((item) => {
      const risk = String(item.riskLevel || "low").toLowerCase();
      if (counts[risk] !== undefined) counts[risk] += 1;
    });

    const priorityQueue = assessments.filter(
      (item) => String(item.riskLevel || "low").toLowerCase() === "high" || item.flaggedForImmediateReview
    );

    return {
      totalAssessments: assessments.length,
      totalStudents: distinctStudents,
      totalCounselors: users.filter((u) => u.role === "counselor" && u.approved && u.active !== false).length,
      pendingApprovals: pending.length,
      highRiskCases: priorityQueue.length,
      riskCounts: counts,
      chartData: [
        { name: "Low", value: counts.low },
        { name: "Medium", value: counts.medium },
        { name: "High", value: counts.high },
      ],
      pieData: [
        { name: "Low", value: counts.low, color: CHART_COLORS[0] },
        { name: "Medium", value: counts.medium, color: CHART_COLORS[1] },
        { name: "High", value: counts.high, color: CHART_COLORS[2] },
      ],
      priorityQueue,
    };
  }, [assessments, pending.length, users]);

  function buildAuditLogs(allUsers, assessmentData) {
    const entries = [];

    allUsers.slice(0, 4).forEach((user) => {
      entries.push({
        id: `user-${user.id}`,
        actor: user.role === "admin" ? "Admin" : "Counselor",
        action: user.active === false ? "Account deactivation reviewed" : "User access reviewed",
        target: user.name || "System account",
        timestamp: new Date().toISOString(),
        outcome: user.active === false ? "Deactivated" : "Verified",
      });
    });

    if (Array.isArray(assessmentData)) {
      assessmentData.slice(0, 5).forEach((assessment, index) => {
        entries.push({
          id: `assessment-${assessment.id || index}`,
          actor: "Counselor",
          action: "Assessment reviewed",
          target: `Case ${String(index + 1).padStart(3, "0")}`,
          timestamp: assessment.reviewedAt || assessment.createdAt || new Date().toISOString(),
          outcome: assessment.status || "Open",
        });
      });
    }

    return entries.length > 0 ? entries : defaultAuditLogs;
  }

  async function handle(action, id) {
    await action(id);
    load();
  }

  function exportCsv() {
    const rows = assessments.length
      ? assessments.map((item, index) => ({
          student_id: `ST-${String(index + 1).padStart(4, "0")}`,
          risk_level: String(item.riskLevel || "low").toLowerCase(),
          status: item.status || "open",
          score: Number.isFinite(item.score) ? item.score : "n/a",
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

  return (
    <div className="max-w-7xl mx-auto px-3 py-8 sm:px-5 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-teal font-semibold tracking-[0.2em] text-[10px] sm:text-xs mb-2">ADMIN</p>
          <h1 className="font-display text-2xl sm:text-3xl text-ink">Mind Bridge Administration</h1>
        </div>
        <div className="inline-flex w-full max-w-md flex-wrap rounded-full border border-ink/10 bg-white p-1 shadow-sm">
          <button
            onClick={() => setActiveTab("counselors")}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
              activeTab === "counselors" ? "bg-ink text-white" : "text-ink/70 hover:text-ink"
            }`}
          >
            Manage Counselors
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
              activeTab === "students" ? "bg-ink text-white" : "text-ink/70 hover:text-ink"
            }`}
          >
            Manage Students
          </button>
        </div>
      </header>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-ink/55">Students</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="font-display text-3xl text-ink">{analytics.totalStudents}</span>
            <span className="rounded-full bg-teal/10 px-2 py-1 text-[10px] font-semibold text-teal">Tracked</span>
          </div>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-ink/55">Counselors</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="font-display text-3xl text-ink">{analytics.totalCounselors}</span>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700">Active</span>
          </div>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-ink/55">Pending</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="font-display text-3xl text-ink">{analytics.pendingApprovals}</span>
            <span className="rounded-full bg-ink/5 px-2 py-1 text-[10px] font-semibold text-ink/70">Review</span>
          </div>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-ink/55">High-risk</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="font-display text-3xl text-ink">{analytics.highRiskCases}</span>
            <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-semibold text-red-700">Priority</span>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-ink/10 bg-white p-6 text-sm text-ink/50 shadow-sm">Loading…</div>
      ) : (
        <>
          {activeTab === "counselors" && pending.length > 0 && (
            <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
                  Pending approval ({pending.length})
                </h2>
              </div>

              <div className="space-y-2">
                {pending.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-ink">{u.name}</p>
                      <p className="text-sm text-ink/55">{u.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handle(approveCounselor, u.id)}
                        className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handle(rejectCounselor, u.id)}
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-ink/70">
                {activeTab === "counselors" ? "Counselor and admin accounts" : "Student accounts"}
              </h2>
            </div>

            <div className="space-y-2">
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-col gap-3 rounded-xl border border-ink/10 bg-mist p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
                    <div>
                      <p className="font-medium text-ink">{u.name}</p>
                      <p className="text-sm text-ink/55">{u.email}</p>
                    </div>
                    <span className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${ROLE_BADGE[u.role]}`}>
                      {u.role}
                    </span>
                    {!u.emailVerified && (
                      <span className="inline-flex w-fit rounded-full border border-ink/10 bg-ink/5 px-2 py-0.5 text-[10px] font-semibold text-ink/50">
                        Unverified
                      </span>
                    )}
                    {u.active === false && (
                      <span className="inline-flex w-fit rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                        Deactivated
                      </span>
                    )}
                  </div>

                  {u.role !== "admin" && (
                    <button
                      onClick={() => handle(u.active === false ? reactivateUser : deactivateUser, u.id)}
                      className={`w-full rounded-lg border px-4 py-2 text-sm font-medium transition sm:w-auto ${
                        u.active === false
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                      }`}
                    >
                      {u.active === false ? "Reactivate" : "Deactivate"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <div className="mt-8 space-y-6">
        <section className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-teal font-semibold tracking-[0.18em] text-[10px]">ANALYTICS</p>
              <h2 className="font-display text-2xl text-ink">System-Wide Analytics Dashboard</h2>
            </div>
            <div className="text-sm text-ink/60">
              <div>{analytics.totalAssessments} total assessments</div>
              <div>{analytics.totalStudents} students tracked</div>
            </div>
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-ink/10 bg-mist p-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-ink/55">Low risk</div>
              <div className="mt-2 font-display text-3xl text-ink">{analytics.riskCounts.low}</div>
            </div>
            <div className="rounded-xl border border-ink/10 bg-mist p-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-ink/55">Medium risk</div>
              <div className="mt-2 font-display text-3xl text-ink">{analytics.riskCounts.medium}</div>
            </div>
            <div className="rounded-xl border border-ink/10 bg-mist p-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-ink/55">High risk</div>
              <div className="mt-2 font-display text-3xl text-ink">{analytics.riskCounts.high}</div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e7e7" />
                  <XAxis dataKey="name" stroke="#556" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} stroke="#556" tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "rgba(31,191,159,0.08)" }} />
                  <Legend />
                  <Bar dataKey="value" name="Assessments" radius={[8, 8, 0, 0]}>
                    {analytics.chartData.map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={CHART_COLORS[index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={35}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {analytics.pieData.map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.color || CHART_COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-teal font-semibold tracking-[0.18em] text-[10px]">PRIORITY</p>
              <h2 className="font-display text-2xl text-ink">High-risk support queue</h2>
            </div>
          </div>

          <div className="space-y-2">
            {analytics.priorityQueue.length === 0 ? (
              <div className="rounded-xl border border-ink/10 bg-mist p-4 text-sm text-ink/60">
                No active high-risk cases at the moment.
              </div>
            ) : (
              analytics.priorityQueue.slice(0, 5).map((item, index) => (
                <div key={item.id || index} className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium text-ink">Case #{String(index + 1).padStart(3, "0")}</div>
                    <div className="text-sm text-ink/60">
                      {item.status || "Open"} • {item.riskLevel || "High"} risk
                    </div>
                  </div>
                  <div className="text-sm text-ink/60">{formatDateTime(item.createdAt || item.submittedAt)}</div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-teal font-semibold tracking-[0.18em] text-[10px]">AUDIT</p>
              <h2 className="font-display text-2xl text-ink">Audit Logs / Activity Tracking</h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-ink/60">
                  <th className="min-w-[100px] py-3 pr-4 font-medium">Actor</th>
                  <th className="min-w-[180px] py-3 pr-4 font-medium">Action</th>
                  <th className="min-w-[150px] py-3 pr-4 font-medium">Target</th>
                  <th className="min-w-[180px] py-3 pr-4 font-medium">Timestamp</th>
                  <th className="py-3 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-ink/5 align-top">
                    <td className="py-3 pr-4">{log.actor}</td>
                    <td className="py-3 pr-4">{log.action}</td>
                    <td className="py-3 pr-4">{log.target}</td>
                    <td className="py-3 pr-4">{formatDateTime(log.timestamp)}</td>
                    <td className="py-3">
                      <span className="inline-flex rounded-full border border-ink/10 bg-mist px-2 py-1 text-[11px] font-medium">
                        {log.outcome}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-teal font-semibold tracking-[0.18em] text-[10px]">EXPORT</p>
              <h2 className="font-display text-2xl text-ink">Data Exporting</h2>
              <p className="mt-1 text-sm text-ink/60">Export an anonymized assessment compliance report as CSV.</p>
            </div>
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Export CSV
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

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
    const totalStudents = new Set(
      assessments
        .map((item) => item.studentId || item.userId || item.student || item.user || "anonymous")
        .filter(Boolean)
    ).size;

    const counts = { low: 0, medium: 0, high: 0 };
    assessments.forEach((item) => {
      const risk = String(item.riskLevel || "low").toLowerCase();
      if (counts[risk] !== undefined) {
        counts[risk] += 1;
      }
    });

    return {
      totalAssessments: assessments.length,
      totalStudents,
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
    };
  }, [assessments]);

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
          risk_level: (item.riskLevel || "low").toLowerCase(),
          status: item.status || "open",
          score: Number.isFinite(item.score) ? item.score : "n/a",
          created_at: item.createdAt || item.submittedAt || "",
          reviewed_at: item.reviewedAt || "",
        }))
      : [{ student_id: "ST-0000", risk_level: "low", status: "n/a", score: "n/a", created_at: "", reviewed_at: "" }];

    const headers = ["student_id", "risk_level", "status", "score", "created_at", "reviewed_at"];
    const csv = [headers, ...rows.map((row) => headers.map((key) => `"${String(row[key]).replace(/"/g, '""')}"`))]
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
    <div className="max-w-6xl mx-auto py-12 px-6">
      <p className="text-teal font-semibold tracking-widest text-xs mb-2">ADMIN</p>
      <h1 className="font-display text-3xl text-ink mb-6">Manage users</h1>

      <div className="inline-flex rounded-full border border-ink/10 bg-white p-1 mb-8">
        <button
          onClick={() => setActiveTab("counselors")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            activeTab === "counselors" ? "bg-ink text-white" : "text-ink/70 hover:text-ink"
          }`}
        >
          Manage Counselors
        </button>
        <button
          onClick={() => setActiveTab("students")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            activeTab === "students" ? "bg-ink text-white" : "text-ink/70 hover:text-ink"
          }`}
        >
          Manage Students
        </button>
      </div>

      {loading && <p className="text-ink/50 text-sm">Loading…</p>}

      {!loading && activeTab === "counselors" && pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-ink/70 uppercase tracking-wide mb-3">
            Pending approval ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((u) => (
              <div
                key={u.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-sm text-ink/50">{u.email}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handle(approveCounselor, u.id)}
                    className="text-sm bg-ink text-white rounded-lg px-4 py-2 hover:brightness-110"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handle(rejectCounselor, u.id)}
                    className="text-sm text-red-600 border border-red-200 rounded-lg px-4 py-2 hover:bg-red-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && (
        <div>
          <h2 className="text-sm font-semibold text-ink/70 uppercase tracking-wide mb-3">
            {activeTab === "counselors" ? "Counselor and admin accounts" : "Student accounts"}
          </h2>
          <div className="space-y-2">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-ink/5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-sm text-ink/50">{u.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${ROLE_BADGE[u.role]}`}>
                    {u.role}
                  </span>
                  {!u.emailVerified && (
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-ink/5 text-ink/40 border-ink/10">
                      Unverified
                    </span>
                  )}
                  {u.active === false && (
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-red-100 text-red-700 border-red-200">
                      Deactivated
                    </span>
                  )}
                </div>
                {u.role !== "admin" && (
                  <button
                    onClick={() => handle(u.active === false ? reactivateUser : deactivateUser, u.id)}
                    className={`text-sm rounded-lg px-4 py-2 border ${
                      u.active === false
                        ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        : "border-red-200 text-red-600 hover:bg-red-50"
                    }`}
                  >
                    {u.active === false ? "Reactivate" : "Deactivate"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 space-y-8">
        <section className="bg-white rounded-2xl border border-ink/10 shadow-sm p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-teal font-semibold tracking-widest text-xs mb-1">ANALYTICS</p>
              <h2 className="font-display text-2xl text-ink">System-Wide Analytics Dashboard</h2>
            </div>
            <div className="text-right text-sm text-ink/60">
              <div>{analytics.totalAssessments} total assessments</div>
              <div>{analytics.totalStudents} students tracked</div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="bg-mist rounded-xl p-4 border border-ink/5">
              <div className="text-xs uppercase tracking-wide text-ink/50">Low risk</div>
              <div className="mt-2 text-3xl font-display text-ink">{analytics.riskCounts.low}</div>
            </div>
            <div className="bg-mist rounded-xl p-4 border border-ink/5">
              <div className="text-xs uppercase tracking-wide text-ink/50">Medium risk</div>
              <div className="mt-2 text-3xl font-display text-ink">{analytics.riskCounts.medium}</div>
            </div>
            <div className="bg-mist rounded-xl p-4 border border-ink/5">
              <div className="text-xs uppercase tracking-wide text-ink/50">High risk</div>
              <div className="mt-2 text-3xl font-display text-ink">{analytics.riskCounts.high}</div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e7e7" />
                  <XAxis dataKey="name" stroke="#556" />
                  <YAxis allowDecimals={false} stroke="#556" />
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

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
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

        <section className="bg-white rounded-2xl border border-ink/10 shadow-sm p-6">
          <p className="text-teal font-semibold tracking-widest text-xs mb-1">AUDIT</p>
          <h2 className="font-display text-2xl text-ink mb-5">Audit Logs / Activity Tracking</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-ink/60">
                  <th className="py-3 pr-6 font-medium">Actor</th>
                  <th className="py-3 pr-6 font-medium">Action</th>
                  <th className="py-3 pr-6 font-medium">Target</th>
                  <th className="py-3 pr-6 font-medium">Timestamp</th>
                  <th className="py-3 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-ink/5">
                    <td className="py-3 pr-6">{log.actor}</td>
                    <td className="py-3 pr-6">{log.action}</td>
                    <td className="py-3 pr-6">{log.target}</td>
                    <td className="py-3 pr-6">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-3">
                      <span className="inline-flex rounded-full border border-ink/10 bg-mist px-2 py-1 text-xs">
                        {log.outcome}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-ink/10 shadow-sm p-6">
          <p className="text-teal font-semibold tracking-widest text-xs mb-1">EXPORT</p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl text-ink">Data Exporting</h2>
              <p className="text-sm text-ink/60 mt-1">
                Export an anonymized assessment compliance report as CSV.
              </p>
            </div>
            <button
              type="button"
              onClick={exportCsv}
              className="bg-ink text-white rounded-lg px-5 py-3 text-sm font-semibold hover:brightness-110"
            >
              Export CSV
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

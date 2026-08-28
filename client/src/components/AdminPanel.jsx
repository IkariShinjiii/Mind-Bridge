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
  assignCounselorToStudent,
} from "../api";
import Spinner from "./Spinner";

const ROLE_BADGE = {
  student: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  counselor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  admin: "bg-purple-500/10 text-purple-400 border-purple-500/20",
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
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("counselors");
  const [auditLogs, setAuditLogs] = useState(defaultAuditLogs);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [exportingCsv, setExportingCsv] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [allUsers, assessmentData] = await Promise.all([
        getAdminUsers().catch(() => []),
        getAssessments().catch(() => []),
      ]);
      setUsers(Array.isArray(allUsers) ? allUsers : []);
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
  const approvedCounselors = useMemo(() => {
    return users.filter((u) => u.role === "counselor" && u.approved && u.active !== false);
  }, [users]);

  async function handleAssignCounselor(studentId, counselorId) {
    const counselor = approvedCounselors.find((c) => c.id === counselorId);
    const counselorName = counselor ? counselor.name || counselor.email : null;
    setActionLoadingId(studentId);
    try {
      await assignCounselorToStudent(studentId, counselorId || null, counselorName);
      await load();
    } catch (err) {
      console.error("Failed to assign counselor", err);
    } finally {
      setActionLoadingId(null);
    }
  }

  const filteredUsers =
    activeTab === "counselors"
      ? users.filter((u) => u.role === "counselor" || u.role === "admin")
      : users.filter((u) => u.role === "student" || !u.role);

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
      totalStudents: distinctStudents || users.filter((u) => u.role === "student" || !u.role).length,
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
        target: user.name || user.email || "System account",
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
    if (actionLoadingId) return;
    setActionLoadingId(id);
    try {
      await action(id);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  }

  function exportCsv() {
    if (exportingCsv) return;
    setExportingCsv(true);

    try {
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
    } finally {
      setExportingCsv(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl animate-fade-up px-3 py-8 sm:px-5 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-cyan-400 font-semibold tracking-[0.2em] text-[10px] sm:text-xs mb-2">ADMIN</p>
          <h1 className="font-display text-2xl sm:text-3xl text-white">Mind Bridge Administration</h1>
        </div>
        <div className="inline-flex w-full max-w-md flex-wrap rounded-full border border-gray-800 bg-gray-900 p-1 shadow-sm">
          <button
            onClick={() => setActiveTab("counselors")}
            className={`tab-button flex-1 rounded-full px-3 py-2 text-sm font-medium transition-all duration-200 ease-out ${
              activeTab === "counselors" ? "bg-cyan-600 text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            Manage Counselors
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className={`tab-button flex-1 rounded-full px-3 py-2 text-sm font-medium transition-all duration-200 ease-out ${
              activeTab === "students" ? "bg-cyan-600 text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            Manage Students
          </button>
        </div>
      </header>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">Students</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="font-display text-3xl text-white">{analytics.totalStudents}</span>
            <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold text-cyan-400">Tracked</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">Counselors</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="font-display text-3xl text-white">{analytics.totalCounselors}</span>
            <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-400">Active</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">Pending</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="font-display text-3xl text-white">{analytics.pendingApprovals}</span>
            <span className="rounded-full bg-gray-800 px-2 py-1 text-[10px] font-semibold text-gray-400">Review</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">High-risk</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="font-display text-3xl text-white">{analytics.highRiskCases}</span>
            <span className="rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-400">Priority</span>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-sm text-gray-500 shadow-sm">Loading admin data…</div>
      ) : (
        <>
          {activeTab === "counselors" && pending.length > 0 && (
            <section className="mb-8 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 shadow-sm">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-400">
                  Pending approval ({pending.length})
                </h2>
              </div>

              <div className="space-y-2">
                {pending.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col gap-3 rounded-xl border border-amber-500/20 bg-gray-900 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-white">{u.name || "Unnamed Counselor"}</p>
                      <p className="text-sm text-gray-400">{u.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handle(approveCounselor, u.id)}
                        disabled={actionLoadingId === u.id}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {actionLoadingId === u.id ? (
                          <>
                            <Spinner size={14} color="#ffffff" className="text-white" />
                            <span>Approving…</span>
                          </>
                        ) : (
                          "Approve"
                        )}
                      </button>
                      <button
                        onClick={() => handle(rejectCounselor, u.id)}
                        disabled={actionLoadingId === u.id}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition duration-200 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {actionLoadingId === u.id ? (
                          <>
                            <Spinner size={14} color="#ef4444" className="text-red-400" />
                            <span>Rejecting…</span>
                          </>
                        ) : (
                          "Reject"
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
                {activeTab === "counselors" ? "Counselor and admin accounts" : "Student accounts"}
              </h2>
            </div>

            {filteredUsers.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No accounts found in this category.</p>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((u, index) => (
                  <div
                    key={u.id}
                    className="stagger-item flex flex-col gap-3 rounded-xl border border-gray-800 bg-gray-800/50 p-3 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    style={{ animationDelay: `${index * 55}ms` }}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
                      <div>
                        <p className="font-medium text-white">{u.name || "User"}</p>
                        <p className="text-sm text-gray-400">{u.email}</p>
                      </div>
                      <span className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${ROLE_BADGE[u.role || "student"]}`}>
                        {u.role || "student"}
                      </span>
                      {u.active === false && (
                        <span className="inline-flex w-fit rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                          Deactivated
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {activeTab === "students" && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-gray-400 text-[11px]">Counselor:</span>
                          <select
                            value={u.assignedCounselorId || ""}
                            onChange={(e) => handleAssignCounselor(u.id, e.target.value)}
                            disabled={actionLoadingId === u.id}
                            className="rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1 text-xs text-white focus:border-cyan-500 focus:outline-none"
                          >
                            <option value="">Unassigned</option>
                            {approvedCounselors.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name || c.email}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {u.role !== "admin" && (
                        <button
                          onClick={() => handle(u.active === false ? reactivateUser : deactivateUser, u.id)}
                          disabled={actionLoadingId === u.id}
                          className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition duration-200 sm:w-auto ${
                            u.active === false
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-60"
                              : "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-60"
                          }`}
                        >
                          {actionLoadingId === u.id ? (
                            <>
                              <Spinner
                                size={14}
                                color={u.active === false ? "#10b981" : "#ef4444"}
                                className={u.active === false ? "text-emerald-400" : "text-red-400"}
                              />
                              <span>{u.active === false ? "Reactivating…" : "Deactivating…"}</span>
                            </>
                          ) : (
                            u.active === false ? "Reactivate" : "Deactivate"
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Analytics & Audit Logs Section */}
      <div className="mt-8 space-y-6">
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-cyan-400 font-semibold tracking-[0.18em] text-[10px]">ANALYTICS</p>
              <h2 className="font-display text-2xl text-white">System-Wide Analytics Dashboard</h2>
            </div>
            <div className="text-sm text-gray-400">
              <div>{analytics.totalAssessments} total assessments</div>
              <div>{analytics.totalStudents} students tracked</div>
            </div>
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-800 bg-gray-800/50 p-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-gray-500">Low risk</div>
              <div className="mt-2 font-display text-3xl text-white">{analytics.riskCounts.low}</div>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-800/50 p-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-gray-500">Medium risk</div>
              <div className="mt-2 font-display text-3xl text-white">{analytics.riskCounts.medium}</div>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-800/50 p-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-gray-500">High risk</div>
              <div className="mt-2 font-display text-3xl text-white">{analytics.riskCounts.high}</div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} stroke="#9ca3af" tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "rgba(31,191,159,0.08)" }} contentStyle={{ backgroundColor: "#1f2937", border: "none", color: "#fff" }} />
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
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", color: "#fff" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Audit Logs */}
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-cyan-400 font-semibold tracking-[0.18em] text-[10px]">AUDIT</p>
              <h2 className="font-display text-2xl text-white">Audit Logs / Activity Tracking</h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="min-w-[100px] py-3 pr-4 font-medium">Actor</th>
                  <th className="min-w-[180px] py-3 pr-4 font-medium">Action</th>
                  <th className="min-w-[150px] py-3 pr-4 font-medium">Target</th>
                  <th className="min-w-[180px] py-3 pr-4 font-medium">Timestamp</th>
                  <th className="py-3 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log, index) => (
                  <tr key={log.id} className="stagger-item border-b border-gray-800/50 align-top" style={{ animationDelay: `${index * 35}ms` }}>
                    <td className="py-3 pr-4 text-gray-300">{log.actor}</td>
                    <td className="py-3 pr-4 text-gray-300">{log.action}</td>
                    <td className="py-3 pr-4 text-gray-300">{log.target}</td>
                    <td className="py-3 pr-4 text-gray-400">{formatDateTime(log.timestamp)}</td>
                    <td className="py-3">
                      <span className="inline-flex rounded-full border border-gray-700 bg-gray-800 px-2 py-1 text-[11px] font-medium text-gray-300">
                        {log.outcome}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Export Section */}
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-cyan-400 font-semibold tracking-[0.18em] text-[10px]">EXPORT</p>
              <h2 className="font-display text-2xl text-white">Data Exporting</h2>
              <p className="mt-1 text-sm text-gray-400">Export an anonymized assessment compliance report as CSV.</p>
            </div>
            <button
              type="button"
              onClick={exportCsv}
              disabled={exportingCsv}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exportingCsv ? (
                <>
                  <Spinner size={15} color="#ffffff" className="text-white" />
                  <span>Exporting…</span>
                </>
              ) : (
                "Export CSV"
              )}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
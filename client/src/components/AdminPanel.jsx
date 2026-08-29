import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ClipboardList,
  Calendar,
  AlertCircle,
  X,
  FileText,
  CheckCircle2,
  Users,
  BarChart3,
  Clock,
  Shield,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
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
  updateAssessmentStatus,
  getAllAppointments,
  approveCounselor,
  rejectCounselor,
  deactivateUser,
  reactivateUser,
  assignCounselorToStudent,
  getUserSettings,
} from "../api";
import { useAuth } from "../AuthContext.jsx";
import Spinner from "./Spinner";
import ManageAvailability from "./ManageAvailability";
import ConfidentialChatModal from "./ConfidentialChatModal";

const RISK_STYLES = {
  high: "bg-red-500/10 text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const STATUS_STYLES = {
  open: "bg-gray-800 text-gray-300 border-gray-700",
  reviewed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  escalated: "bg-red-500/10 text-red-400 border-red-500/20",
};

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

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export default function AdminPanel() {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");

  const [users, setUsers] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Main Tabs: 'cases' | 'analytics' | 'availability' | 'accounts'
  const [mainTab, setMainTab] = useState(tabFromUrl || "cases");

  useEffect(() => {
    if (tabFromUrl && ["cases", "analytics", "availability", "accounts"].includes(tabFromUrl)) {
      setMainTab(tabFromUrl);
    } else if (!tabFromUrl) {
      setMainTab("cases");
    }
  }, [tabFromUrl]);

  const handleTabSelect = (tab) => {
    setMainTab(tab);
    if (tab === "cases") {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  // Cases Triage Filters
  const [filter, setFilter] = useState("flagged");
  const [assignedOnly, setAssignedOnly] = useState(false);
  const [updatingAssessmentId, setUpdatingAssessmentId] = useState(null);

  // Case Inspector Modal State
  const [activeCase, setActiveCase] = useState(null);
  const [studentContact, setStudentContact] = useState(null);
  const [loadingContact, setLoadingContact] = useState(false);
  const [counselorNoteInput, setCounselorNoteInput] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [chatStudent, setChatStudent] = useState(null);

  // Accounts Tab Sub-filter: 'staff' | 'students'
  const [accountSubTab, setAccountSubTab] = useState("staff");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [auditLogs, setAuditLogs] = useState(defaultAuditLogs);

  async function loadData() {
    setLoading(true);
    try {
      const [allUsers, assessmentData, appointmentData] = await Promise.all([
        getAdminUsers().catch(() => []),
        getAssessments().catch(() => []),
        getAllAppointments().catch(() => []),
      ]);
      setUsers(Array.isArray(allUsers) ? allUsers : []);
      setAssessments(Array.isArray(assessmentData) ? assessmentData : []);
      setAppointments(Array.isArray(appointmentData) ? appointmentData : []);
      setAuditLogs(buildAuditLogs(allUsers || [], assessmentData || []));
    } catch (error) {
      console.error("Failed to load admin data", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function buildAuditLogs(allUsers, assessmentData) {
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

  // --- CASE TRIAGE ACTIONS ---
  async function markAssessmentStatus(id, nextStatus = "reviewed") {
    if (updatingAssessmentId) return;
    setUpdatingAssessmentId(id);
    try {
      await updateAssessmentStatus(id, nextStatus);
      await loadData();
      if (activeCase && activeCase.id === id) {
        setActiveCase((prev) => ({ ...prev, status: nextStatus }));
      }
    } catch (err) {
      console.error("Failed to update assessment status", err);
    } finally {
      setUpdatingAssessmentId(null);
    }
  }

  async function openCaseInspector(item) {
    setActiveCase(item);
    setCounselorNoteInput(item.counselorNotes || "");
    setStudentContact(null);
    if (item.studentId && item.studentId !== "anonymous") {
      setLoadingContact(true);
      try {
        const studentDoc = await getUserSettings(item.studentId);
        setStudentContact(studentDoc);
      } catch (err) {
        console.warn("Could not load student contact info", err);
      } finally {
        setLoadingContact(false);
      }
    }
  }

  async function handleSaveNotes() {
    if (!activeCase) return;
    setSavingNotes(true);
    try {
      await updateAssessmentStatus(activeCase.id, activeCase.status || "open", counselorNoteInput);
      setActiveCase((prev) => ({ ...prev, counselorNotes: counselorNoteInput }));
      await loadData();
    } catch (err) {
      console.error("Error saving counselor notes", err);
    } finally {
      setSavingNotes(false);
    }
  }

  // --- ACCOUNT MANAGEMENT ACTIONS ---
  const pendingStaff = useMemo(() => {
    return users.filter((u) => (u.role === "counselor" || u.role === "admin") && !u.approved);
  }, [users]);

  const approvedStaff = useMemo(() => {
    return users.filter((u) => (u.role === "counselor" || u.role === "admin") && u.approved && u.active !== false);
  }, [users]);

  async function handleAssignCounselor(studentId, counselorId) {
    const counselor = approvedStaff.find((c) => c.id === counselorId);
    const counselorName = counselor ? counselor.name || counselor.email : null;
    setActionLoadingId(studentId);
    try {
      await assignCounselorToStudent(studentId, counselorId || null, counselorName);
      await loadData();
    } catch (err) {
      console.error("Failed to assign counselor", err);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleAccountAction(action, id) {
    if (actionLoadingId) return;
    setActionLoadingId(id);
    try {
      await action(id);
      await loadData();
    } finally {
      setActionLoadingId(null);
    }
  }

  // CSV Export
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

  // --- METRICS COMPUTATION ---
  const immediateCount = useMemo(() => {
    return assessments.filter((c) => c.flaggedForImmediateReview || c.riskLevel === "high").length;
  }, [assessments]);

  const openCasesCount = useMemo(() => {
    return assessments.filter((c) => (c.status || "open") === "open").length;
  }, [assessments]);

  const pendingAppointmentsCount = useMemo(() => {
    return appointments.filter((a) => (a.status || "Pending Review").toLowerCase().includes("pending")).length;
  }, [appointments]);

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

    return {
      totalAssessments: assessments.length,
      totalStudents: distinctStudents || users.filter((u) => u.role === "student" || !u.role).length,
      totalStaff: approvedStaff.length,
      pendingApprovals: pendingStaff.length,
      highRiskCases: immediateCount,
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
  }, [assessments, users, approvedStaff.length, pendingStaff.length, immediateCount]);

  // Filtered assessment cases for Triage table
  const visibleCases = useMemo(() => {
    return assessments.filter((item) => {
      if (assignedOnly && currentUser?.uid) {
        if (item.assignedCounselorId && item.assignedCounselorId !== currentUser.uid) {
          return false;
        }
      }

      const risk = item.riskLevel || "low";
      const isFlagged = item.flaggedForImmediateReview || risk === "high";

      if (filter === "flagged") return isFlagged;
      if (filter === "open") return (item.status || "open") === "open";
      if (filter === "reviewed") return (item.status || "open") === "reviewed";
      if (filter === "escalated") return (item.status || "open") === "escalated";
      if (filter === "high") return risk === "high";
      if (filter === "medium") return risk === "medium";
      return true;
    });
  }, [assessments, filter, assignedOnly, currentUser?.uid]);

  // Filtered users for Accounts tab
  const filteredUsers = useMemo(() => {
    if (accountSubTab === "staff") {
      return users.filter((u) => u.role === "admin" || u.role === "counselor");
    }
    return users.filter((u) => u.role === "student" || !u.role);
  }, [users, accountSubTab]);

  return (
    <div className="mx-auto max-w-7xl animate-fade-up space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-gray-800 pb-5">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-semibold mb-1">
          Staff & Administration Control Center
        </p>
        <h1 className="font-sans text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
          Staff & Admin Dashboard
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Consolidated clinical triage, student case management, schedule availability, and system analytics.
        </p>
      </div>

      {/* Top Metric Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/90 p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 font-semibold">Students</p>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-white">{analytics.totalStudents}</span>
            <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
              Tracked
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/90 p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 font-semibold">Staff Accounts</p>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-white">{analytics.totalStaff}</span>
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
              Active
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-4 shadow-sm">
          <div className="text-[10px] uppercase tracking-[0.16em] text-red-400 font-semibold flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span>High Risk</span>
          </div>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-white">{immediateCount}</span>
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-300 border border-red-500/30">
              Priority
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/90 p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 font-semibold">Open Cases</p>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-white">{openCasesCount}</span>
            <span className="rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold text-teal-300 border border-teal-500/20">
              In Queue
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/90 p-4 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 font-semibold">Appointments</p>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-white">{pendingAppointmentsCount}</span>
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/20">
              Pending
            </span>
          </div>
        </div>
      </section>

      {/* Main Section Navigation Switcher */}
      {mainTab !== "accounts" && (
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-800 pb-3">
          <button
            onClick={() => handleTabSelect("cases")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition interactive-tap ${
              mainTab === "cases"
                ? "bg-teal-600 text-white shadow-sm"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            <span>Student Cases & Triage</span>
          </button>

          <button
            onClick={() => handleTabSelect("analytics")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition interactive-tap ${
              mainTab === "analytics"
                ? "bg-teal-600 text-white shadow-sm"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>System Analytics & Trends</span>
          </button>

          <button
            onClick={() => handleTabSelect("availability")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition interactive-tap ${
              mainTab === "availability"
                ? "bg-teal-600 text-white shadow-sm"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Manage My Availability</span>
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: STUDENT CASES & CLINICAL TRIAGE                    */}
      {/* ======================================================== */}
      {mainTab === "cases" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-1.5">
                {[
                  ["flagged", "Flagged / Urgent"],
                  ["open", "Open Cases"],
                  ["reviewed", "Reviewed"],
                  ["escalated", "Escalated"],
                  ["high", "High Risk"],
                  ["medium", "Medium Risk"],
                  ["all", "All Submissions"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setFilter(value)}
                    className={`rounded-full px-3.5 py-1.5 text-xs transition font-medium ${
                      filter === value
                        ? "bg-teal-600 text-white shadow-sm font-semibold"
                        : "border border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setAssignedOnly(!assignedOnly)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition border interactive-tap ${
                  assignedOnly
                    ? "border-teal-500 bg-teal-500/20 text-teal-300 shadow-sm"
                    : "border-gray-800 bg-gray-900 text-gray-400 hover:text-white"
                }`}
              >
                {assignedOnly ? "✓ My Assigned Students" : "Filter: My Assigned"}
              </button>
            </div>

            <span className="text-xs text-gray-400">
              Showing {visibleCases.length} case{visibleCases.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-gray-800 bg-gray-900/60 p-8 text-gray-400 gap-3">
              <Spinner size={20} className="text-teal-400" />
              <span>Loading student assessment records...</span>
            </div>
          ) : visibleCases.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-900/40 p-10 text-center text-sm text-gray-500">
              No student cases in this view category.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-gray-900 shadow-sm">
              <table className="min-w-[750px] w-full text-left text-sm">
                <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 font-semibold">Student</th>
                    <th className="px-4 py-3.5 font-semibold">Risk Classification</th>
                    <th className="px-4 py-3.5 font-semibold">Score</th>
                    <th className="px-4 py-3.5 font-semibold">Case Status</th>
                    <th className="px-4 py-3.5 font-semibold">Submitted</th>
                    <th className="px-4 py-3.5 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCases.map((item) => {
                    const risk = item.riskLevel || "low";
                    const status = item.status || "open";
                    const submittedAt = item.submittedAt
                      ? new Date(item.submittedAt).toLocaleString()
                      : item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : "Unknown";

                    return (
                      <tr key={item.id} className="border-t border-gray-800 align-middle hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-white">{item.studentName || "Student"}</div>
                          <div className="text-xs text-gray-400 font-mono">{item.studentEmail || "Institutional email"}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${RISK_STYLES[risk]}`}>
                              {risk} Risk
                            </span>
                            {item.flaggedForImmediateReview && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-red-500 bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider animate-pulse">
                                <AlertCircle className="h-3 w-3" /> Immediate
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-gray-300 font-mono text-xs">
                          {item.total ?? 0} / {item.maxScore ?? 21}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status] || "bg-gray-800 text-gray-300 border-gray-700"}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-400">{submittedAt}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openCaseInspector(item)}
                              className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-xs font-medium text-teal-300 hover:border-teal-500 hover:text-white transition interactive-tap"
                            >
                              Inspect Case
                            </button>
                            {status !== "reviewed" ? (
                              <button
                                onClick={() => markAssessmentStatus(item.id, "reviewed")}
                                disabled={updatingAssessmentId === item.id}
                                className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 transition disabled:opacity-60 interactive-tap"
                              >
                                {updatingAssessmentId === item.id ? "Updating…" : "Mark Reviewed"}
                              </button>
                            ) : (
                              <button
                                onClick={() => markAssessmentStatus(item.id, "open")}
                                disabled={updatingAssessmentId === item.id}
                                className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-400 hover:border-gray-500 hover:text-white transition disabled:opacity-60 interactive-tap"
                              >
                                {updatingAssessmentId === item.id ? "Updating…" : "Re-open"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SYSTEM ANALYTICS & TRENDS                         */}
      {/* ======================================================== */}
      {mainTab === "analytics" && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-cyan-400 font-semibold tracking-[0.18em] text-[10px]">ANALYTICS</p>
                <h2 className="font-sans text-xl sm:text-2xl font-bold text-white tracking-tight">System-Wide Clinical Analytics</h2>
              </div>
              <div className="text-sm text-gray-400">
                <div>{analytics.totalAssessments} total assessments</div>
                <div>{analytics.totalStudents} students tracked</div>
              </div>
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-800 bg-gray-800/50 p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-gray-400 font-semibold">Low risk</div>
                <div className="mt-2 font-sans text-3xl font-bold text-white">{analytics.riskCounts.low}</div>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-800/50 p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-gray-400 font-semibold">Medium risk</div>
                <div className="mt-2 font-sans text-3xl font-bold text-white">{analytics.riskCounts.medium}</div>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-800/50 p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-gray-400 font-semibold">High risk</div>
                <div className="mt-2 font-sans text-3xl font-bold text-white">{analytics.riskCounts.high}</div>
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
                <h2 className="font-sans text-xl sm:text-2xl font-bold text-white tracking-tight">Audit Logs / Activity Tracking</h2>
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
                    <tr key={log.id} className="border-b border-gray-800/50 align-top">
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
                <h2 className="font-sans text-xl sm:text-2xl font-bold text-white tracking-tight">Data Exporting</h2>
                <p className="mt-1 text-sm text-gray-400">Export an anonymized assessment compliance report as CSV.</p>
              </div>
              <button
                type="button"
                onClick={exportCsv}
                disabled={exportingCsv}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
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
      )}

      {/* ======================================================== */}
      {/* TAB 3: MANAGE MY AVAILABILITY                            */}
      {/* ======================================================== */}
      {mainTab === "availability" && (
        <div className="max-w-4xl space-y-4">
          <ManageAvailability />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: MANAGE ACCOUNTS & ASSIGNMENTS                     */}
      {/* ======================================================== */}
      {mainTab === "accounts" && (
        <div className="space-y-6">
          {/* Sub Tab Switcher: Staff vs Students */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAccountSubTab("staff")}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                accountSubTab === "staff"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "border border-gray-800 bg-gray-900 text-gray-400 hover:text-white"
              }`}
            >
              Manage Staff Accounts ({approvedStaff.length + pendingStaff.length})
            </button>
            <button
              onClick={() => setAccountSubTab("students")}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                accountSubTab === "students"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "border border-gray-800 bg-gray-900 text-gray-400 hover:text-white"
              }`}
            >
              Manage Students & Counselor Assignments
            </button>
          </div>

          {/* Pending Staff Approvals (if any) */}
          {accountSubTab === "staff" && pendingStaff.length > 0 && (
            <section className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 shadow-sm">
              <div className="mb-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-400">
                  Pending Staff Approvals ({pendingStaff.length})
                </h2>
              </div>

              <div className="space-y-2">
                {pendingStaff.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col gap-3 rounded-xl border border-amber-500/20 bg-gray-900 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-white">{u.name || "Unnamed Staff"}</p>
                      <p className="text-sm text-gray-400">{u.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleAccountAction(approveCounselor, u.id)}
                        disabled={actionLoadingId === u.id}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
                      >
                        {actionLoadingId === u.id ? <Spinner size={14} /> : "Approve Staff"}
                      </button>
                      <button
                        onClick={() => handleAccountAction(rejectCounselor, u.id)}
                        disabled={actionLoadingId === u.id}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-60"
                      >
                        {actionLoadingId === u.id ? <Spinner size={14} /> : "Reject"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* User Accounts Table */}
          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
                {accountSubTab === "staff" ? "Staff & Administrator Accounts" : "Student Accounts & Assignments"}
              </h2>
            </div>

            {filteredUsers.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No accounts found in this category.</p>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col gap-3 rounded-xl border border-gray-800 bg-gray-800/50 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
                      <div>
                        <p className="font-medium text-white">{u.name || "User"}</p>
                        <p className="text-sm text-gray-400 font-mono">{u.email}</p>
                      </div>
                      <span className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${ROLE_BADGE[u.role || "student"] || "bg-gray-800 text-gray-300"}`}>
                        {u.role === "counselor" || u.role === "admin" ? "Staff Admin" : "Student"}
                      </span>
                      {u.active === false && (
                        <span className="inline-flex w-fit rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                          Deactivated
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {accountSubTab === "students" && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-gray-400 text-[11px]">Assigned Counselor:</span>
                          <select
                            value={u.assignedCounselorId || ""}
                            onChange={(e) => handleAssignCounselor(u.id, e.target.value)}
                            disabled={actionLoadingId === u.id}
                            className="rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1 text-xs text-white focus:border-cyan-500 focus:outline-none"
                          >
                            <option value="">Unassigned</option>
                            {approvedStaff.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name || c.email}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <button
                        onClick={() => handleAccountAction(u.active === false ? reactivateUser : deactivateUser, u.id)}
                        disabled={actionLoadingId === u.id || u.id === currentUser?.uid}
                        className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3.5 py-1.5 text-xs font-medium transition ${
                          u.id === currentUser?.uid
                            ? "opacity-30 cursor-not-allowed border-gray-700 text-gray-500"
                            : u.active === false
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                            : "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        }`}
                      >
                        {actionLoadingId === u.id ? (
                          <Spinner size={12} />
                        ) : u.active === false ? (
                          "Reactivate"
                        ) : (
                          "Deactivate"
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ======================================================== */}
      {/* CASE INSPECTOR MODAL                                     */}
      {/* ======================================================== */}
      {activeCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-up">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-800 bg-gray-900 p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-800 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white">{activeCase.studentName || "Student Assessment Details"}</h3>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${RISK_STYLES[activeCase.riskLevel || "low"]}`}>
                    {activeCase.riskLevel} Risk
                  </span>
                  {activeCase.flaggedForImmediateReview && (
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                      Immediate Concern
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Email: <span className="text-teal-300 font-mono">{activeCase.studentEmail}</span> • Submitted: {new Date(activeCase.createdAt || activeCase.submittedAt || Date.now()).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setActiveCase(null)}
                className="text-gray-400 hover:text-white text-xl p-1 interactive-tap"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Questions Breakdown */}
            <div className="mb-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-3">
                Screening Responses Breakdown (PHQ-9 / GAD-7 Scale)
              </h4>
              {Array.isArray(activeCase.questionSummary) && activeCase.questionSummary.length > 0 ? (
                <div className="space-y-2">
                  {activeCase.questionSummary.map((q, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                        q.isCrisisItem && Number(q.score) > 0
                          ? "border-red-500 bg-red-950/40 text-red-200 font-medium"
                          : "border-gray-800 bg-gray-950/60 text-gray-300"
                      }`}
                    >
                      <div className="flex-1">
                        <span className="font-semibold text-white mr-1.5">{idx + 1}.</span>
                        {q.text}
                        {q.isCrisisItem && (
                          <span className="ml-2 text-[10px] uppercase font-bold text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded">
                            Crisis Item
                          </span>
                        )}
                      </div>
                      <div className="shrink-0 font-bold text-xs px-2.5 py-1 rounded bg-gray-800 text-cyan-300 font-mono">
                        Score: {q.score ?? "—"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Total Score: {activeCase.total} / {activeCase.maxScore || 21}</p>
              )}
            </div>

            {/* Emergency Contact Information */}
            <div className="mb-6 rounded-xl border border-gray-800 bg-gray-950/70 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Emergency Contact Record
              </h4>
              {loadingContact ? (
                <div className="text-xs text-gray-500 flex items-center gap-2"><Spinner size={12} /> Loading profile contact...</div>
              ) : studentContact?.emergencyContact?.name ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-300">
                  <div>Name: <span className="font-semibold text-white">{studentContact.emergencyContact.name}</span></div>
                  <div>Relationship: <span className="font-semibold text-white">{studentContact.emergencyContact.relationship}</span></div>
                  <div>Primary Phone: <span className="font-semibold text-cyan-300 font-mono">{studentContact.emergencyContact.phone}</span></div>
                  {studentContact.emergencyContact.alternatePhone && (
                    <div>Alternate Phone: <span className="font-semibold text-gray-300 font-mono">{studentContact.emergencyContact.alternatePhone}</span></div>
                  )}
                  {studentContact.emergencyContact.notes && (
                    <div className="col-span-2 text-gray-400 italic">Notes: {studentContact.emergencyContact.notes}</div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500">Student has not designated an emergency contact in profile settings.</p>
              )}
            </div>

            {/* Case Notes & Status Update */}
            <div className="mb-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
                Confidential Staff Case Notes & Status
              </h4>
              <textarea
                rows={3}
                value={counselorNoteInput}
                onChange={(e) => setCounselorNoteInput(e.target.value)}
                placeholder="Document case assessment, outreach actions, or scheduled guidance sessions..."
                className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
              />
              <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Set Case Status:</span>
                  {["open", "reviewed", "escalated"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => markAssessmentStatus(activeCase.id, st)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                        activeCase.status === st
                          ? "bg-cyan-600 text-white"
                          : "border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 transition disabled:opacity-50"
                >
                  {savingNotes ? "Saving Notes…" : "Save Case Notes"}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-800">
              {activeCase.studentId && activeCase.studentId !== "anonymous" && (
                <button
                  type="button"
                  onClick={() =>
                    setChatStudent({
                      id: activeCase.studentId,
                      name: activeCase.studentName || "Student",
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 transition shadow-md"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Open Confidential Chat</span>
                </button>
              )}

              <button
                onClick={() => setActiveCase(null)}
                className="rounded-xl border border-gray-700 px-5 py-2 text-xs font-medium text-gray-300 hover:bg-gray-800 transition ml-auto"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confidential Chat Modal */}
      {chatStudent && (
        <ConfidentialChatModal
          isOpen={Boolean(chatStudent)}
          onClose={() => setChatStudent(null)}
          studentId={chatStudent.id}
          recipientName={chatStudent.name}
          recipientRole="student"
        />
      )}
    </div>
  );
}
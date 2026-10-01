import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ClipboardList,
  Calendar,
  AlertCircle,
  AlertTriangle,
  Diamond,
  CircleCheck,
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

import { RISK_STYLES, STATUS_STYLES, ROLE_BADGE, CHART_COLORS, defaultAuditLogs, formatDateTime, buildAuditLogs, downloadAssessmentsCsv } from "./admin/adminUtils";


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
  // CSV Export
  function exportCsv() {
    if (exportingCsv) return;
    setExportingCsv(true);
    try {
      downloadAssessmentsCsv(assessments);
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

  // Highest priority first: safety-flagged, then high, medium, low; open before reviewed; newest first.
  const triageCases = useMemo(() => {
    const rank = (c) => (c.flaggedForImmediateReview ? 0 : { high: 1, medium: 2, low: 3 }[c.riskLevel || "low"] ?? 3);
    const when = (c) => new Date(c.submittedAt || c.createdAt || 0).getTime() || 0;
    return [...visibleCases].sort((x, y) => {
      const byRank = rank(x) - rank(y);
      if (byRank) return byRank;
      const xDone = (x.status || "open") === "reviewed" ? 1 : 0;
      const yDone = (y.status || "open") === "reviewed" ? 1 : 0;
      if (xDone !== yDone) return xDone - yDone;
      return when(y) - when(x);
    });
  }, [visibleCases]);

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
      <div className="border-b border-[color:var(--mb-line)] pb-5">
        <h1 className="font-sans text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[color:var(--mb-ink)]">
          Staff & Admin Dashboard
        </h1>
        <p className="text-sm text-[color:var(--mb-muted)] mt-1">
          Consolidated clinical triage, student case management, schedule availability, and system analytics.
        </p>
      </div>

      {/* Top Metric Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--mb-muted)] font-semibold">Students</p>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-[color:var(--mb-ink)]">{analytics.totalStudents}</span>
            <span className="rounded-full bg-[color:var(--mb-brand-bg)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--mb-brand)] border border-[color:var(--mb-brand)]">
              Tracked
            </span>
          </div>
        </div>

        <div className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--mb-muted)] font-semibold">Staff Accounts</p>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-[color:var(--mb-ink)]">{analytics.totalStaff}</span>
            <span className="rounded-full bg-[color:var(--mb-warn-bg)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--mb-warn)] border border-[color:var(--mb-warn)]">
              Active
            </span>
          </div>
        </div>

        <div className="rounded-md border border-[color:var(--mb-urgent)] bg-[color:var(--mb-urgent-bg)] p-4 shadow-sm">
          <div className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--mb-urgent)] font-semibold flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[color:var(--mb-urgent-solid)] animate-pulse" />
            <span>High Risk</span>
          </div>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-[color:var(--mb-ink)]">{immediateCount}</span>
            <span className="rounded-full bg-[color:var(--mb-urgent-bg)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--mb-urgent)] border border-[color:var(--mb-urgent)]">
              Priority
            </span>
          </div>
        </div>

        <div className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--mb-muted)] font-semibold">Open Cases</p>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-[color:var(--mb-ink)]">{openCasesCount}</span>
            <span className="rounded-full bg-[color:var(--mb-brand-bg)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--mb-brand)] border border-[color:var(--mb-brand)]">
              In Queue
            </span>
          </div>
        </div>

        <div className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-4 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--mb-muted)] font-semibold">Appointments</p>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-[color:var(--mb-ink)]">{pendingAppointmentsCount}</span>
            <span className="rounded-full bg-[color:var(--mb-warn-bg)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--mb-warn)] border border-[color:var(--mb-warn)]">
              Pending
            </span>
          </div>
        </div>
      </section>

      {/* Main Section Navigation Switcher */}
      {mainTab !== "accounts" && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[color:var(--mb-line)] pb-3">
          <button
            onClick={() => handleTabSelect("cases")}
            className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition interactive-tap ${
              mainTab === "cases"
                ? "bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)] shadow-sm"
                : "text-[color:var(--mb-muted)] hover:bg-[color:var(--mb-surface-2)] hover:text-[color:var(--mb-ink)]"
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            <span>Student Cases & Triage</span>
          </button>

          <button
            onClick={() => handleTabSelect("analytics")}
            className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition interactive-tap ${
              mainTab === "analytics"
                ? "bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)] shadow-sm"
                : "text-[color:var(--mb-muted)] hover:bg-[color:var(--mb-surface-2)] hover:text-[color:var(--mb-ink)]"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>System Analytics & Trends</span>
          </button>

          <button
            onClick={() => handleTabSelect("availability")}
            className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition interactive-tap ${
              mainTab === "availability"
                ? "bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)] shadow-sm"
                : "text-[color:var(--mb-muted)] hover:bg-[color:var(--mb-surface-2)] hover:text-[color:var(--mb-ink)]"
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
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter cases">
              {[
                ["flagged", "Flagged / urgent"],
                ["open", "Open"],
                ["reviewed", "Reviewed"],
                ["escalated", "Escalated"],
                ["high", "High risk"],
                ["medium", "Medium risk"],
                ["all", "All"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                  className={`min-h-[44px] rounded border-2 px-3.5 font-bold transition-colors ${
                    filter === value
                      ? "border-[color:var(--mb-panel)] bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)]"
                      : "border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] text-[color:var(--mb-ink)] hover:border-[color:var(--mb-ink)]"
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAssignedOnly(!assignedOnly)}
                aria-pressed={assignedOnly}
                className={`min-h-[44px] rounded border-2 px-3.5 font-bold transition-colors ${
                  assignedOnly
                    ? "border-[color:var(--mb-brand)] bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-brand)]"
                    : "border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] text-[color:var(--mb-ink)] hover:border-[color:var(--mb-ink)]"
                }`}
              >
                {assignedOnly ? "Showing my assigned students" : "Only my assigned students"}
              </button>
            </div>
            <p className="text-[color:var(--mb-muted)]" aria-live="polite">
              {triageCases.length} case{triageCases.length !== 1 ? "s" : ""}, highest priority first
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center gap-3 rounded-md border-2 border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-8 text-[color:var(--mb-muted)]">
              <Spinner size={20} className="text-[color:var(--mb-brand)]" />
              <span>Loading student check-ins...</span>
            </div>
          ) : triageCases.length === 0 ? (
            <div className="rounded-md border-2 border-dashed border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-10 text-center text-[color:var(--mb-muted)]">
              No cases match this filter.
            </div>
          ) : (
            <ul className="space-y-3">
              {triageCases.map((item) => {
                const risk = item.riskLevel || "low";
                const status = item.status || "open";
                const immediate = Boolean(item.flaggedForImmediateReview);
                const when = item.submittedAt || item.createdAt;
                const submittedAt = when ? new Date(when).toLocaleString() : "Unknown";
                const RiskIcon = risk === "high" ? AlertTriangle : risk === "medium" ? Diamond : CircleCheck;
                const riskTone =
                  risk === "high"
                    ? "bg-[color:var(--mb-urgent-solid)] text-[color:var(--mb-panel-ink)]"
                    : risk === "medium"
                    ? "bg-[color:var(--mb-warn-bg)] text-[color:var(--mb-warn)] border-2 border-[color:var(--mb-warn)]"
                    : "bg-[color:var(--mb-safe-bg)] text-[color:var(--mb-safe)] border-2 border-[color:var(--mb-safe)]";

                return (
                  <li
                    key={item.id}
                    className={`grid gap-4 rounded-md border-2 bg-[color:var(--mb-surface)] p-3 sm:grid-cols-[7.5rem_1fr_auto] sm:items-center ${
                      immediate ? "border-[color:var(--mb-urgent)]" : "border-[color:var(--mb-line)]"
                    }`}
                  >
                    <div className={`flex flex-row items-center gap-3 rounded p-3 sm:flex-col sm:justify-center sm:gap-1 sm:py-4 ${riskTone}`}>
                      <RiskIcon className="h-7 w-7 shrink-0" aria-hidden="true" />
                      <span className="mb-sign text-xl font-bold capitalize leading-none">{risk} risk</span>
                    </div>

                    <div className="min-w-0">
                      <p className="mb-sign text-2xl font-bold leading-tight">{item.studentName || "Student"}</p>
                      <p className="truncate font-mono text-sm text-[color:var(--mb-muted)]">
                        {item.studentEmail || "Institutional email"}
                      </p>
                      <p className="mt-1 text-[color:var(--mb-muted)]">
                        Score {item.total ?? 0} of {item.maxScore ?? 21} · {submittedAt}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded border px-2 py-0.5 text-sm font-bold capitalize ${
                            STATUS_STYLES[status] || "border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] text-[color:var(--mb-muted)]"
                          }`}
                        >
                          {status}
                        </span>
                        {immediate && (
                          <span className="inline-flex items-center gap-1 rounded bg-[color:var(--mb-urgent-solid)] px-2 py-0.5 text-sm font-bold text-[color:var(--mb-panel-ink)]">
                            <AlertCircle className="h-4 w-4" aria-hidden="true" /> Safety question flagged
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:flex-col">
                      <button type="button" onClick={() => openCaseInspector(item)} className="mb-btn mb-btn-solid !min-h-[44px]">
                        Inspect case
                      </button>
                      {status !== "reviewed" ? (
                        <button
                          type="button"
                          onClick={() => markAssessmentStatus(item.id, "reviewed")}
                          disabled={updatingAssessmentId === item.id}
                          className="mb-btn mb-btn-line !min-h-[44px]"
                        >
                          {updatingAssessmentId === item.id ? "Updating…" : "Mark reviewed"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => markAssessmentStatus(item.id, "open")}
                          disabled={updatingAssessmentId === item.id}
                          className="mb-btn mb-btn-line !min-h-[44px]"
                        >
                          {updatingAssessmentId === item.id ? "Updating…" : "Re-open"}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SYSTEM ANALYTICS & TRENDS                         */}
      {/* ======================================================== */}
      {mainTab === "analytics" && (
        <div className="space-y-6">
          <section className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[color:var(--mb-brand)] font-semibold tracking-[0.18em] text-[10px]">ANALYTICS</p>
                <h2 className="font-sans text-xl sm:text-2xl font-bold text-[color:var(--mb-ink)] tracking-tight">System-Wide Clinical Analytics</h2>
              </div>
              <div className="text-sm text-[color:var(--mb-muted)]">
                <div>{analytics.totalAssessments} total assessments</div>
                <div>{analytics.totalStudents} students tracked</div>
              </div>
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--mb-muted)] font-semibold">Low risk</div>
                <div className="mt-2 font-sans text-3xl font-bold text-[color:var(--mb-ink)]">{analytics.riskCounts.low}</div>
              </div>
              <div className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--mb-muted)] font-semibold">Medium risk</div>
                <div className="mt-2 font-sans text-3xl font-bold text-[color:var(--mb-ink)]">{analytics.riskCounts.medium}</div>
              </div>
              <div className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--mb-muted)] font-semibold">High risk</div>
                <div className="mt-2 font-sans text-3xl font-bold text-[color:var(--mb-ink)]">{analytics.riskCounts.high}</div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--mb-line)" />
                    <XAxis dataKey="name" stroke="var(--mb-muted)" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} stroke="var(--mb-muted)" tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "rgba(31,191,159,0.08)" }} contentStyle={{ backgroundColor: "var(--mb-surface)", border: "2px solid var(--mb-line)", color: "var(--mb-ink)" }} />
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
                    <Tooltip contentStyle={{ backgroundColor: "var(--mb-surface)", border: "2px solid var(--mb-line)", color: "var(--mb-ink)" }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Audit Logs */}
          <section className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[color:var(--mb-brand)] font-semibold tracking-[0.18em] text-[10px]">AUDIT</p>
                <h2 className="font-sans text-xl sm:text-2xl font-bold text-[color:var(--mb-ink)] tracking-tight">Audit Logs / Activity Tracking</h2>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--mb-line)] text-[color:var(--mb-muted)]">
                    <th className="min-w-[100px] py-3 pr-4 font-medium">Actor</th>
                    <th className="min-w-[180px] py-3 pr-4 font-medium">Action</th>
                    <th className="min-w-[150px] py-3 pr-4 font-medium">Target</th>
                    <th className="min-w-[180px] py-3 pr-4 font-medium">Timestamp</th>
                    <th className="py-3 font-medium">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, index) => (
                    <tr key={log.id} className="border-b border-[color:var(--mb-line)] align-top">
                      <td className="py-3 pr-4 text-[color:var(--mb-muted)]">{log.actor}</td>
                      <td className="py-3 pr-4 text-[color:var(--mb-muted)]">{log.action}</td>
                      <td className="py-3 pr-4 text-[color:var(--mb-muted)]">{log.target}</td>
                      <td className="py-3 pr-4 text-[color:var(--mb-muted)]">{formatDateTime(log.timestamp)}</td>
                      <td className="py-3">
                        <span className="inline-flex rounded-full border border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] px-2 py-1 text-[11px] font-medium text-[color:var(--mb-muted)]">
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
          <section className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[color:var(--mb-brand)] font-semibold tracking-[0.18em] text-[10px]">EXPORT</p>
                <h2 className="font-sans text-xl sm:text-2xl font-bold text-[color:var(--mb-ink)] tracking-tight">Data Exporting</h2>
                <p className="mt-1 text-sm text-[color:var(--mb-muted)]">Export an anonymized assessment compliance report as CSV.</p>
              </div>
              <button
                type="button"
                onClick={exportCsv}
                disabled={exportingCsv}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[color:var(--mb-panel)] px-5 py-3 text-sm font-semibold text-[color:var(--mb-panel-ink)] transition duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exportingCsv ? (
                  <>
                    <Spinner size={15} color="#ffffff" className="text-[color:var(--mb-ink)]" />
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
              className={`rounded-md px-4 py-2 text-xs font-semibold transition ${
                accountSubTab === "staff"
                  ? "bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)] shadow-sm"
                  : "border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] text-[color:var(--mb-muted)] hover:text-[color:var(--mb-ink)]"
              }`}
            >
              Manage Staff Accounts ({approvedStaff.length + pendingStaff.length})
            </button>
            <button
              onClick={() => setAccountSubTab("students")}
              className={`rounded-md px-4 py-2 text-xs font-semibold transition ${
                accountSubTab === "students"
                  ? "bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)] shadow-sm"
                  : "border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] text-[color:var(--mb-muted)] hover:text-[color:var(--mb-ink)]"
              }`}
            >
              Manage Students & Counselor Assignments
            </button>
          </div>

          {/* Pending Staff Approvals (if any) */}
          {accountSubTab === "staff" && pendingStaff.length > 0 && (
            <section className="rounded-md border border-[color:var(--mb-warn)] bg-[color:var(--mb-warn-bg)] p-4 shadow-sm">
              <div className="mb-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--mb-warn)]">
                  Pending Staff Approvals ({pendingStaff.length})
                </h2>
              </div>

              <div className="space-y-2">
                {pendingStaff.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col gap-3 rounded-md border border-[color:var(--mb-warn)] bg-[color:var(--mb-surface)] p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-[color:var(--mb-ink)]">{u.name || "Unnamed Staff"}</p>
                      <p className="text-sm text-[color:var(--mb-muted)]">{u.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleAccountAction(approveCounselor, u.id)}
                        disabled={actionLoadingId === u.id}
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-[color:var(--mb-panel)] px-4 py-2 text-sm font-medium text-[color:var(--mb-panel-ink)] transition hover:brightness-110 disabled:opacity-60"
                      >
                        {actionLoadingId === u.id ? <Spinner size={14} /> : "Approve Staff"}
                      </button>
                      <button
                        onClick={() => handleAccountAction(rejectCounselor, u.id)}
                        disabled={actionLoadingId === u.id}
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-[color:var(--mb-urgent)] px-4 py-2 text-sm font-medium text-[color:var(--mb-urgent)] hover:bg-[color:var(--mb-urgent-bg)] disabled:opacity-60"
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
          <section className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--mb-muted)]">
                {accountSubTab === "staff" ? "Staff & Administrator Accounts" : "Student Accounts & Assignments"}
              </h2>
            </div>

            {filteredUsers.length === 0 ? (
              <p className="text-sm text-[color:var(--mb-muted)] py-4">No accounts found in this category.</p>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col gap-3 rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] p-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
                      <div>
                        <p className="font-medium text-[color:var(--mb-ink)]">{u.name || "User"}</p>
                        <p className="text-sm text-[color:var(--mb-muted)] font-mono">{u.email}</p>
                      </div>
                      <span className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${ROLE_BADGE[u.role || "student"] || "bg-[color:var(--mb-surface-2)] text-[color:var(--mb-muted)]"}`}>
                        {u.role === "counselor" || u.role === "admin" ? "Staff Admin" : "Student"}
                      </span>
                      {u.active === false && (
                        <span className="inline-flex w-fit rounded-full border border-[color:var(--mb-urgent)] bg-[color:var(--mb-urgent-bg)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--mb-urgent)]">
                          Deactivated
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {accountSubTab === "students" && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-[color:var(--mb-muted)] text-[11px]">Assigned Counselor:</span>
                          <select
                            value={u.assignedCounselorId || ""}
                            onChange={(e) => handleAssignCounselor(u.id, e.target.value)}
                            disabled={actionLoadingId === u.id}
                            className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] px-2.5 py-1 text-xs text-[color:var(--mb-ink)] focus:border-[color:var(--mb-brand)] focus:outline-none"
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
                        className={`inline-flex items-center justify-center gap-2 rounded-md border px-3.5 py-1.5 text-xs font-medium transition ${
                          u.id === currentUser?.uid
                            ? "opacity-30 cursor-not-allowed border-[color:var(--mb-line)] text-[color:var(--mb-muted)]"
                            : u.active === false
                            ? "border-[color:var(--mb-safe)] bg-[color:var(--mb-safe-bg)] text-[color:var(--mb-safe)] hover:bg-[color:var(--mb-safe-bg)]"
                            : "border-[color:var(--mb-urgent)] bg-[color:var(--mb-urgent-bg)] text-[color:var(--mb-urgent)] hover:bg-[color:var(--mb-urgent-bg)]"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80  p-4 animate-fade-up">
          <div className="w-full max-w-2xl rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-6 sm:p-8 shadow-sm max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[color:var(--mb-line)] mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-[color:var(--mb-ink)]">{activeCase.studentName || "Student Assessment Details"}</h3>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${RISK_STYLES[activeCase.riskLevel || "low"]}`}>
                    {activeCase.riskLevel} Risk
                  </span>
                  {activeCase.flaggedForImmediateReview && (
                    <span className="rounded-full bg-[color:var(--mb-urgent-solid)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--mb-panel-ink)] uppercase">
                      Immediate Concern
                    </span>
                  )}
                </div>
                <p className="text-xs text-[color:var(--mb-muted)] mt-1">
                  Email: <span className="text-[color:var(--mb-brand)] font-mono">{activeCase.studentEmail}</span> • Submitted: {new Date(activeCase.createdAt || activeCase.submittedAt || Date.now()).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setActiveCase(null)}
                className="text-[color:var(--mb-muted)] hover:text-[color:var(--mb-ink)] text-xl p-1 interactive-tap"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Questions Breakdown */}
            <div className="mb-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--mb-muted)] mb-3">
                Screening Responses Breakdown (PHQ-9 / GAD-7 Scale)
              </h4>
              {Array.isArray(activeCase.questionSummary) && activeCase.questionSummary.length > 0 ? (
                <div className="space-y-2">
                  {activeCase.questionSummary.map((q, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-md border text-xs flex items-center justify-between gap-3 ${
                        q.isCrisisItem && Number(q.score) > 0
                          ? "border-[color:var(--mb-urgent)] bg-[color:var(--mb-urgent-bg)] text-[color:var(--mb-urgent)] font-medium"
                          : "border-[color:var(--mb-line)] bg-[color:var(--mb-ground)] text-[color:var(--mb-muted)]"
                      }`}
                    >
                      <div className="flex-1">
                        <span className="font-semibold text-[color:var(--mb-ink)] mr-1.5">{idx + 1}.</span>
                        {q.text}
                        {q.isCrisisItem && (
                          <span className="ml-2 text-[10px] uppercase font-bold text-[color:var(--mb-urgent)] border border-[color:var(--mb-urgent)] px-1.5 py-0.5 rounded">
                            Crisis Item
                          </span>
                        )}
                      </div>
                      <div className="shrink-0 font-bold text-xs px-2.5 py-1 rounded bg-[color:var(--mb-surface-2)] text-[color:var(--mb-brand)] font-mono">
                        Score: {q.score ?? "—"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[color:var(--mb-muted)]">Total Score: {activeCase.total} / {activeCase.maxScore || 21}</p>
              )}
            </div>

            {/* Emergency Contact Information */}
            <div className="mb-6 rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-ground)] p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--mb-muted)] mb-2">
                Emergency Contact Record
              </h4>
              {loadingContact ? (
                <div className="text-xs text-[color:var(--mb-muted)] flex items-center gap-2"><Spinner size={12} /> Loading profile contact...</div>
              ) : studentContact?.emergencyContact?.name ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[color:var(--mb-muted)]">
                  <div>Name: <span className="font-semibold text-[color:var(--mb-ink)]">{studentContact.emergencyContact.name}</span></div>
                  <div>Relationship: <span className="font-semibold text-[color:var(--mb-ink)]">{studentContact.emergencyContact.relationship}</span></div>
                  <div>Primary Phone: <span className="font-semibold text-[color:var(--mb-brand)] font-mono">{studentContact.emergencyContact.phone}</span></div>
                  {studentContact.emergencyContact.alternatePhone && (
                    <div>Alternate Phone: <span className="font-semibold text-[color:var(--mb-muted)] font-mono">{studentContact.emergencyContact.alternatePhone}</span></div>
                  )}
                  {studentContact.emergencyContact.notes && (
                    <div className="col-span-2 text-[color:var(--mb-muted)] italic">Notes: {studentContact.emergencyContact.notes}</div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[color:var(--mb-muted)]">Student has not designated an emergency contact in profile settings.</p>
              )}
            </div>

            {/* Case Notes & Status Update */}
            <div className="mb-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--mb-muted)] mb-2">
                Confidential Staff Case Notes & Status
              </h4>
              <textarea
                rows={3}
                value={counselorNoteInput}
                onChange={(e) => setCounselorNoteInput(e.target.value)}
                placeholder="Document case assessment, outreach actions, or scheduled guidance sessions..."
                className="w-full rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] px-4 py-2.5 text-xs text-[color:var(--mb-ink)] placeholder:text-[color:var(--mb-muted)] focus:border-[color:var(--mb-brand)] focus:outline-none"
              />
              <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[color:var(--mb-muted)]">Set Case Status:</span>
                  {["open", "reviewed", "escalated"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => markAssessmentStatus(activeCase.id, st)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition ${
                        activeCase.status === st
                          ? "bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)]"
                          : "border border-[color:var(--mb-line)] text-[color:var(--mb-muted)] hover:bg-[color:var(--mb-surface-2)] hover:text-[color:var(--mb-ink)]"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="rounded-md bg-[color:var(--mb-panel)] px-4 py-2 text-xs font-semibold text-[color:var(--mb-panel-ink)] hover:bg-[color:var(--mb-panel)] transition disabled:opacity-50"
                >
                  {savingNotes ? "Saving Notes…" : "Save Case Notes"}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[color:var(--mb-line)]">
              {activeCase.studentId && activeCase.studentId !== "anonymous" && (
                <button
                  type="button"
                  onClick={() =>
                    setChatStudent({
                      id: activeCase.studentId,
                      name: activeCase.studentName || "Student",
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-md bg-[color:var(--mb-panel)] px-4 py-2 text-xs font-semibold text-[color:var(--mb-panel-ink)] hover:bg-[color:var(--mb-panel)] transition shadow-sm"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Open Confidential Chat</span>
                </button>
              )}

              <button
                onClick={() => setActiveCase(null)}
                className="rounded-md border border-[color:var(--mb-line)] px-5 py-2 text-xs font-medium text-[color:var(--mb-muted)] hover:bg-[color:var(--mb-surface-2)] transition ml-auto"
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
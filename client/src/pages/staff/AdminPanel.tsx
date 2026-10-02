import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { m, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  Calendar,
  AlertCircle,
  AlertTriangle,
  Diamond,
  CircleCheck,
  BarChart3,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { BarChart, Bar, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
} from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import Spinner from "../../components/ui/Spinner";
import { useToast } from "../../components/ui/Toast";
import Modal from "../../components/ui/Modal";
import ManageAvailability from "../../components/staff/ManageAvailability";
const ConfidentialChatModal = lazy(() => import("../../components/chat/ConfidentialChatModal"));

import {
  RISK_STYLES,
  STATUS_STYLES,
  ROLE_BADGE,
  CHART_COLORS,
  formatDateTime,
  downloadAssessmentsCsv,
} from "../../utils/adminExport";
import { friendlyError } from "../../utils/errors";
import { pagePreset, transition, useMotionPreset } from "../../lib/motion";
import { validate } from "../../lib/validate";
import { caseReviewSchema } from "../../lib/schemas";
import type { Appointment, Assessment, CaseStatus, RiskLevel, StoredRole, UserProfile } from "../../types";

type StaffUser = UserProfile & { id: string };
type MainTab = "cases" | "analytics" | "availability" | "accounts";
type CaseFilter = "flagged" | "open" | "reviewed" | "escalated" | "high" | "medium" | "all";
const MAIN_TABS: readonly MainTab[] = ["cases", "analytics", "availability", "accounts"];
const isMainTab = (value: string | null): value is MainTab =>
  value !== null && (MAIN_TABS as readonly string[]).includes(value);

// Destructive outline button: overrides the hover fill of .mb-btn-line
const DANGER_LINE =
  "!border-[color:var(--mb-urgent)] !text-[color:var(--mb-urgent)] hover:!bg-[color:var(--mb-urgent-bg)] hover:!text-[color:var(--mb-urgent)]";

/** Cards rise in one after another; the stagger stops at 8 so long lists do not drag. */
const cardEntrance = (i: number, enabled: boolean) =>
  enabled
    ? {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0, transition: { ...transition.base, delay: Math.min(i, 8) * 0.04 } },
      }
    : { initial: false as const };

const roleLabel = (role?: StoredRole | string) =>
  role === "admin" ? "Admin" : role === "counselor" ? "Counselor" : "Student";

function Stat({
  label,
  value,
  note,
  tone,
  className = "",
}: {
  label: string;
  value: number;
  note: string;
  tone?: "urgent";
  className?: string;
}) {
  const urgent = tone === "urgent";
  return (
    <div
      className={`rounded-md border p-4 shadow-mb-sm ${
        urgent
          ? "border-[color:var(--mb-urgent-solid)] bg-[color:var(--mb-urgent-solid)] text-[color:var(--mb-panel-ink)]"
          : "border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] text-[color:var(--mb-ink)]"
      } ${className}`}
    >
      <p className="text-sm font-bold uppercase tracking-wider">{label}</p>
      <p className="mb-sign mt-1 text-4xl font-bold leading-none tabular-nums">{value}</p>
      <p className={`mt-1 text-sm ${urgent ? "" : "text-[color:var(--mb-muted)]"}`}>{note}</p>
    </div>
  );
}

function RiskTag({ risk }: { risk: RiskLevel }) {
  const Icon = risk === "high" ? AlertTriangle : risk === "medium" ? Diamond : CircleCheck;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded border px-2 py-1 font-bold capitalize ${RISK_STYLES[risk] ?? RISK_STYLES.low}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {risk} risk
    </span>
  );
}

const MAIN_TAB_LINKS: ReadonlyArray<readonly [Exclude<MainTab, "accounts">, LucideIcon, string]> = [
  ["cases", ClipboardList, "Cases and triage"],
  ["analytics", BarChart3, "Analytics"],
  ["availability", Calendar, "My availability"],
];

const CASE_FILTERS: ReadonlyArray<readonly [CaseFilter, string]> = [
  ["flagged", "Flagged / urgent"],
  ["open", "Open"],
  ["reviewed", "Reviewed"],
  ["escalated", "Escalated"],
  ["high", "High risk"],
  ["medium", "Medium risk"],
  ["all", "All"],
];

const RISK_CARDS: ReadonlyArray<readonly [RiskLevel, string, LucideIcon]> = [
  ["low", "Low risk", CircleCheck],
  ["medium", "Medium risk", Diamond],
  ["high", "High risk", AlertTriangle],
];

export default function AdminPanel() {
  const { currentUser } = useAuth();
  const panelMotion = useMotionPreset(pagePreset);
  const cardsMove = panelMotion.initial !== false;
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");

  const [users, setUsers] = useState<StaffUser[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const [mainTab, setMainTab] = useState<MainTab>(isMainTab(tabFromUrl) ? tabFromUrl : "cases");

  useEffect(() => {
    if (isMainTab(tabFromUrl)) {
      setMainTab(tabFromUrl);
    } else if (!tabFromUrl) {
      setMainTab("cases");
    }
  }, [tabFromUrl]);

  const handleTabSelect = (tab: MainTab) => {
    setMainTab(tab);
    if (tab === "cases") {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  // Cases Triage Filters
  const [filter, setFilter] = useState<CaseFilter>("flagged");
  const [assignedOnly, setAssignedOnly] = useState(false);
  const [updatingAssessmentId, setUpdatingAssessmentId] = useState<string | null>(null);

  // Case Inspector Modal State
  const [activeCase, setActiveCase] = useState<Assessment | null>(null);
  const [studentContact, setStudentContact] = useState<StaffUser | null>(null);
  const [loadingContact, setLoadingContact] = useState(false);
  const [counselorNoteInput, setCounselorNoteInput] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [chatStudent, setChatStudent] = useState<{ id: string; name: string } | null>(null);

  const [accountSubTab, setAccountSubTab] = useState<"staff" | "students">("staff");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [loadError, setLoadError] = useState("");
  const toast = useToast();
  const showNotice = (type: "success" | "error", message: string) =>
    type === "success" ? toast.success(message) : toast.error(message);

  async function loadData() {
    setLoading(true);
    try {
      // A failed fetch shows an empty list; remember which ones failed so the page can say so
      const failed: string[] = [];
      const guard =
        <T,>(label: string) =>
        (): T[] => {
          failed.push(label);
          return [];
        };
      const [allUsers, assessmentData, appointmentData] = await Promise.all([
        getAdminUsers().catch(guard<StaffUser>("accounts")),
        getAssessments().catch(guard<Assessment>("check-ins")),
        getAllAppointments().catch(guard<Appointment>("appointments")),
      ]);
      setLoadError(failed.length ? `Could not load ${failed.join(", ")}. What you see below may be incomplete.` : "");
      setUsers(allUsers);
      setAssessments(assessmentData);
      setAppointments(appointmentData);
    } catch (error) {
      console.error("Failed to load admin data", error);
      setLoadError("Could not load the dashboard. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  // --- CASE TRIAGE ACTIONS ---
  async function markAssessmentStatus(id: string, nextStatus: CaseStatus = "reviewed") {
    if (updatingAssessmentId) return;
    setUpdatingAssessmentId(id);
    try {
      await updateAssessmentStatus(id, nextStatus);
      await loadData();
      if (activeCase && activeCase.id === id) {
        setActiveCase((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      }
      showNotice("success", `Case marked ${nextStatus}.`);
    } catch (err) {
      console.error("Failed to update assessment status", err);
      showNotice("error", "Could not update the case status. It has not been changed. Try again.");
    } finally {
      setUpdatingAssessmentId(null);
    }
  }

  async function openCaseInspector(item: Assessment) {
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
    const review = validate(caseReviewSchema, {
      id: activeCase.id,
      status: activeCase.status || "open",
      counselorNotes: counselorNoteInput,
    });
    if (!review.ok) {
      showNotice("error", review.error.userMessage);
      return;
    }
    setSavingNotes(true);
    try {
      await updateAssessmentStatus(review.data.id, review.data.status, review.data.counselorNotes);
      setActiveCase((prev) => (prev ? { ...prev, counselorNotes: review.data.counselorNotes } : prev));
      await loadData();
      showNotice("success", "Case notes saved.");
    } catch (err) {
      console.error("Error saving counselor notes", err);
      showNotice(
        "error",
        friendlyError(err, "Could not save the case notes. Your text is still in the box. Try again."),
      );
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

  async function handleAssignCounselor(studentId: string, counselorId: string) {
    const counselor = approvedStaff.find((c) => c.id === counselorId);
    const counselorName = counselor ? counselor.name || counselor.email || null : null;
    setActionLoadingId(studentId);
    try {
      await assignCounselorToStudent(studentId, counselorId || null, counselorName);
      await loadData();
      showNotice("success", counselorId ? `Assigned to ${counselorName}.` : "Counselor assignment removed.");
    } catch (err) {
      console.error("Failed to assign counselor", err);
      showNotice("error", "Could not change the counselor assignment. Try again.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleAccountAction(action: (id: string) => Promise<void>, id: string, successMessage = "Done.") {
    if (actionLoadingId) return;
    setActionLoadingId(id);
    try {
      await action(id);
      await loadData();
      showNotice("success", successMessage);
    } catch (err) {
      console.error("Account action failed", err);
      showNotice("error", "That account change did not go through. Try again.");
    } finally {
      setActionLoadingId(null);
    }
  }

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
        .filter(Boolean),
    ).size;

    const counts: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0 };
    assessments.forEach((item) => {
      const risk = String(item.riskLevel || "low").toLowerCase();
      if (risk === "low" || risk === "medium" || risk === "high") counts[risk] += 1;
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
    const rank = (c: Assessment) =>
      c.flaggedForImmediateReview ? 0 : (({ high: 1, medium: 2, low: 3 } as const)[c.riskLevel || "low"] ?? 3);
    const when = (c: Assessment) => new Date(c.submittedAt || c.createdAt || 0).getTime() || 0;
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
    <div className="w-full space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-[color:var(--mb-line)] pb-6">
        <h1 className="text-3xl font-bold text-[color:var(--mb-ink)] sm:text-4xl">Staff dashboard</h1>
        <p className="mt-1 max-w-[65ch] text-[color:var(--mb-muted)]">
          Triage student check-ins, manage accounts and availability, and review system-wide trends.
        </p>
      </div>

      {loadError && !loading && (
        <div role="alert" className="mb-alert flex flex-wrap items-center justify-between gap-3 font-medium">
          <span>{loadError}</span>
          <button type="button" onClick={loadData} className="mb-btn mb-btn-line !min-h-[44px] !px-4">
            Try again
          </button>
        </div>
      )}

      {/* At-a-glance counts, most urgent first */}
      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat
          tone="urgent"
          label="High risk"
          value={immediateCount}
          note="Need review first"
          className="col-span-2 lg:col-span-1"
        />
        <Stat label="Open cases" value={openCasesCount} note="Waiting in the queue" />
        <Stat label="Pending sessions" value={pendingAppointmentsCount} note="Appointment requests" />
        <Stat label="Students" value={analytics.totalStudents} note="With check-ins" />
        <Stat
          label="Staff"
          value={analytics.totalStaff}
          note="Approved accounts"
          className="col-span-2 sm:col-span-1"
        />
      </section>

      {/* Section switcher */}
      {mainTab !== "accounts" && (
        <nav
          aria-label="Dashboard sections"
          className="flex flex-wrap gap-2 border-b border-[color:var(--mb-line)] pb-4"
        >
          {MAIN_TAB_LINKS.map(([tab, Icon, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabSelect(tab)}
              aria-current={mainTab === tab ? "page" : undefined}
              className="mb-chip"
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
      )}

      {/* ======================================================== */}
      {/* TAB 1: STUDENT CASES & CLINICAL TRIAGE                    */}
      {/* ======================================================== */}
      <AnimatePresence mode="wait" initial={false}>
        {mainTab === "cases" && (
          <m.div key="cases" {...panelMotion} className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter cases">
                {CASE_FILTERS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    aria-pressed={filter === value}
                    className="mb-chip"
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAssignedOnly(!assignedOnly)}
                  aria-pressed={assignedOnly}
                  className="mb-chip"
                >
                  {assignedOnly ? "Showing my assigned students" : "Only my assigned students"}
                </button>
              </div>
              <p className="text-[color:var(--mb-muted)]" aria-live="polite">
                {triageCases.length} case{triageCases.length !== 1 ? "s" : ""}, highest priority first
              </p>
            </div>

            {loading ? (
              <div className="flex min-h-[300px] items-center justify-center gap-3 rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-8 text-[color:var(--mb-muted)]">
                <Spinner size={20} className="text-[color:var(--mb-brand)]" />
                <span>Loading student check-ins...</span>
              </div>
            ) : triageCases.length === 0 ? (
              <div className="rounded-md border border-dashed border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-12 text-center text-[color:var(--mb-muted)]">
                No cases match this filter.
              </div>
            ) : (
              <ul className="space-y-3">
                {triageCases.map((item, i) => {
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
                        ? "bg-[color:var(--mb-warn-bg)] text-[color:var(--mb-warn)] border border-[color:var(--mb-warn)]"
                        : "bg-[color:var(--mb-safe-bg)] text-[color:var(--mb-safe)] border border-[color:var(--mb-safe)]";

                  return (
                    <m.li key={item.id} {...cardEntrance(i, cardsMove)}>
                      {/* Entrance lives on the li: an inline transform here would block the card's CSS hover lift. */}
                      <div
                        className={`mb-card-interactive grid gap-4 rounded-lg border bg-[color:var(--mb-surface)] p-4 shadow-mb-sm sm:grid-cols-[8rem_1fr_auto] sm:items-center ${
                          immediate
                            ? "border-[color:var(--mb-urgent)] ring-1 ring-[color:var(--mb-urgent)]"
                            : "border-[color:var(--mb-line)]"
                        }`}
                      >
                        <div
                          className={`flex flex-row items-center gap-3 rounded-md p-3 sm:flex-col sm:justify-center sm:gap-1 sm:py-4 ${riskTone}`}
                        >
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
                              className={`inline-flex rounded border px-2 py-1 text-sm font-bold capitalize ${
                                STATUS_STYLES[status] ||
                                "border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] text-[color:var(--mb-muted)]"
                              }`}
                            >
                              {status}
                            </span>
                            {immediate && (
                              <span className="inline-flex items-center gap-1 rounded bg-[color:var(--mb-urgent-solid)] px-2 py-1 text-sm font-bold text-[color:var(--mb-panel-ink)]">
                                <AlertCircle className="h-4 w-4" aria-hidden="true" /> Safety question flagged
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 sm:flex-col">
                          <button
                            type="button"
                            onClick={() => openCaseInspector(item)}
                            className="mb-btn mb-btn-solid !min-h-[44px]"
                          >
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
                      </div>
                    </m.li>
                  );
                })}
              </ul>
            )}
          </m.div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: SYSTEM ANALYTICS & TRENDS                         */}
        {/* ======================================================== */}
        {mainTab === "analytics" && (
          <m.div key="analytics" {...panelMotion} className="space-y-8">
            <section aria-labelledby="risk-heading" className="mb-card">
              <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <h2 id="risk-heading" className="text-2xl font-bold text-[color:var(--mb-ink)]">
                  Risk across all check-ins
                </h2>
                <p className="text-[color:var(--mb-muted)]">
                  {analytics.totalAssessments} check-ins from {analytics.totalStudents} students. Screening aid, not a
                  diagnosis.
                </p>
              </div>

              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                {RISK_CARDS.map(([risk, label, Icon]) => {
                  const n = analytics.riskCounts[risk];
                  const pct = analytics.totalAssessments ? Math.round((n / analytics.totalAssessments) * 100) : 0;
                  return (
                    <div key={risk} className={`rounded-md border p-4 ${RISK_STYLES[risk]}`}>
                      <p className="flex items-center gap-2 font-bold">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                        {label}
                      </p>
                      <p className="mb-sign mt-1 text-4xl font-bold leading-none tabular-nums">{n}</p>
                      <p className="mt-1 text-sm">{pct}% of check-ins</p>
                    </div>
                  );
                })}
              </div>

              <div
                className="h-72 w-full"
                role="img"
                aria-label={`Bar chart of check-ins by risk level: ${analytics.riskCounts.low} low, ${analytics.riskCounts.medium} medium, ${analytics.riskCounts.high} high.`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.chartData} margin={{ top: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--mb-line)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="var(--mb-muted)"
                      tick={{ fontSize: 14 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      stroke="var(--mb-muted)"
                      tick={{ fontSize: 14 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--mb-surface-2)" }}
                      contentStyle={{
                        backgroundColor: "var(--mb-surface)",
                        border: "2px solid var(--mb-line)",
                        borderRadius: 6,
                        color: "var(--mb-ink)",
                      }}
                    />
                    <Bar dataKey="value" name="Check-ins" radius={[4, 4, 0, 0]} maxBarSize={96}>
                      {analytics.chartData.map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_COLORS[index]} />
                      ))}
                      <LabelList dataKey="value" position="top" fill="var(--mb-ink)" fontSize={14} fontWeight={700} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Export */}
            <section aria-labelledby="export-heading" className="mb-card">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 id="export-heading" className="text-2xl font-bold text-[color:var(--mb-ink)]">
                    Export report
                  </h2>
                  <p className="mt-1 max-w-[65ch] text-[color:var(--mb-muted)]">
                    Download an anonymized compliance report of all check-ins as a CSV file.
                  </p>
                </div>
                <button type="button" onClick={exportCsv} disabled={exportingCsv} className="mb-btn mb-btn-solid">
                  {exportingCsv && <Spinner size={16} />}
                  {exportingCsv ? "Exporting…" : "Export CSV"}
                </button>
              </div>
            </section>
          </m.div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: MANAGE MY AVAILABILITY                            */}
        {/* ======================================================== */}
        {mainTab === "availability" && (
          <m.div key="availability" {...panelMotion} className="max-w-4xl">
            <ManageAvailability />
          </m.div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: MANAGE ACCOUNTS & ASSIGNMENTS                     */}
        {/* ======================================================== */}
        {mainTab === "accounts" && (
          <m.div key="accounts" {...panelMotion} className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[color:var(--mb-ink)]">Accounts</h2>
              <p className="mt-1 max-w-[65ch] text-[color:var(--mb-muted)]">
                Approve staff, deactivate accounts, and assign each student a counselor.
              </p>
            </div>

            <div className="flex flex-wrap gap-2" role="group" aria-label="Account type">
              {(
                [
                  ["staff", `Staff (${approvedStaff.length + pendingStaff.length})`],
                  ["students", "Students and counselor assignments"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAccountSubTab(val)}
                  aria-pressed={accountSubTab === val}
                  className="mb-chip"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Pending staff approvals */}
            {accountSubTab === "staff" && pendingStaff.length > 0 && (
              <section
                aria-labelledby="pending-heading"
                className="rounded-md border border-[color:var(--mb-warn)] bg-[color:var(--mb-warn-bg)] p-4 sm:p-6"
              >
                <h3 id="pending-heading" className="mb-3 text-xl font-bold text-[color:var(--mb-warn)]">
                  Waiting for approval ({pendingStaff.length})
                </h3>
                <ul className="space-y-3">
                  {pendingStaff.map((u, i) => (
                    <m.li
                      key={u.id}
                      {...cardEntrance(i, cardsMove)}
                      className="flex flex-col gap-3 mb-card mb-card-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-[color:var(--mb-ink)]">{u.name || "Unnamed staff"}</p>
                        <p className="break-all font-mono text-sm text-[color:var(--mb-muted)]">{u.email}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleAccountAction(approveCounselor, u.id, "Staff account approved.")}
                          disabled={actionLoadingId === u.id}
                          className="mb-btn mb-btn-solid !px-4 text-sm"
                        >
                          {actionLoadingId === u.id && <Spinner size={14} />}
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAccountAction(rejectCounselor, u.id, "Staff request rejected.")}
                          disabled={actionLoadingId === u.id}
                          className={`mb-btn mb-btn-line !px-4 text-sm ${DANGER_LINE}`}
                        >
                          Reject
                        </button>
                      </div>
                    </m.li>
                  ))}
                </ul>
              </section>
            )}

            <section key={accountSubTab} aria-labelledby="accounts-heading">
              <h3
                id="accounts-heading"
                className="mb-3 border-b border-[color:var(--mb-line)] pb-2 text-xl font-bold text-[color:var(--mb-ink)]"
              >
                {accountSubTab === "staff" ? "Staff and administrators" : "Students"}
              </h3>

              {filteredUsers.length === 0 ? (
                <p className="rounded-md border border-dashed border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-8 text-center text-[color:var(--mb-muted)]">
                  No accounts in this category.
                </p>
              ) : (
                <ul className="space-y-3">
                  {filteredUsers.map((u, i) => {
                    const isSelf = u.id === currentUser?.uid;
                    const deactivated = u.active === false;
                    const busy = actionLoadingId === u.id;
                    return (
                      <m.li
                        key={u.id}
                        {...cardEntrance(i, cardsMove)}
                        className="flex flex-col gap-4 mb-card mb-card-sm lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-bold text-[color:var(--mb-ink)]">{u.name || "Unnamed user"}</p>
                            <span
                              className={`rounded border px-2 py-1 text-xs font-bold uppercase tracking-wider ${
                                ROLE_BADGE[u.role || "student"] || ROLE_BADGE.student
                              }`}
                            >
                              {roleLabel(u.role)}
                            </span>
                            {deactivated && (
                              <span className="rounded border border-[color:var(--mb-urgent)] bg-[color:var(--mb-urgent-bg)] px-2 py-1 text-xs font-bold uppercase tracking-wider text-[color:var(--mb-urgent)]">
                                Deactivated
                              </span>
                            )}
                            {isSelf && <span className="text-sm text-[color:var(--mb-muted)]">(you)</span>}
                          </div>
                          <p className="break-all font-mono text-sm text-[color:var(--mb-muted)]">{u.email}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {accountSubTab === "students" && (
                            <label className="flex items-center gap-2 text-sm">
                              <span className="font-bold text-[color:var(--mb-ink)]">Counselor</span>
                              <select
                                value={u.assignedCounselorId || ""}
                                onChange={(e) => handleAssignCounselor(u.id, e.target.value)}
                                disabled={busy}
                                className="mb-field !w-auto min-w-[10rem]"
                              >
                                <option value="">Unassigned</option>
                                {approvedStaff.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name || c.email}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              handleAccountAction(
                                deactivated ? reactivateUser : deactivateUser,
                                u.id,
                                deactivated ? "Account reactivated." : "Account deactivated.",
                              )
                            }
                            disabled={busy || isSelf}
                            title={isSelf ? "You cannot deactivate your own account" : undefined}
                            className={`mb-btn mb-btn-line !px-4 text-sm ${
                              deactivated
                                ? "!border-[color:var(--mb-safe)] !text-[color:var(--mb-safe)] hover:!bg-[color:var(--mb-safe-bg)] hover:!text-[color:var(--mb-safe)]"
                                : DANGER_LINE
                            }`}
                          >
                            {busy && <Spinner size={14} />}
                            {deactivated ? "Reactivate" : "Deactivate"}
                          </button>
                        </div>
                      </m.li>
                    );
                  })}
                </ul>
              )}
            </section>
          </m.div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* CASE INSPECTOR                                           */}
      {/* ======================================================== */}
      <Modal
        isOpen={Boolean(activeCase)}
        onClose={() => setActiveCase(null)}
        title={activeCase?.studentName || "Student check-in"}
        description={
          activeCase
            ? `${activeCase.studentEmail || "No email on file"} · Submitted ${formatDateTime(
                activeCase.createdAt || activeCase.submittedAt,
              )}`
            : undefined
        }
        maxWidth="max-w-2xl"
        footer={
          activeCase ? (
            <>
              {activeCase.studentId && activeCase.studentId !== "anonymous" && (
                <button
                  type="button"
                  onClick={() =>
                    setChatStudent({ id: activeCase.studentId, name: activeCase.studentName || "Student" })
                  }
                  className="mb-btn mb-btn-solid !px-4 text-sm"
                >
                  <MessageSquare className="h-5 w-5" aria-hidden="true" />
                  Open confidential chat
                </button>
              )}
              <button type="button" onClick={() => setActiveCase(null)} className="mb-btn mb-btn-line !px-4 text-sm">
                Close
              </button>
            </>
          ) : undefined
        }
      >
        {activeCase && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <RiskTag risk={activeCase.riskLevel || "low"} />
              {activeCase.flaggedForImmediateReview && (
                <span className="inline-flex items-center gap-1 rounded bg-[color:var(--mb-urgent-solid)] px-2 py-1 text-sm font-bold text-[color:var(--mb-panel-ink)]">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" /> Safety question flagged
                </span>
              )}
              <span className="text-[color:var(--mb-muted)]">
                Score {activeCase.total ?? 0} of {activeCase.maxScore || 21}
              </span>
            </div>

            <section aria-labelledby="resp-heading">
              <h3 id="resp-heading" className="mb-2 text-lg font-bold text-[color:var(--mb-ink)]">
                Screening responses
              </h3>
              {Array.isArray(activeCase.questionSummary) && activeCase.questionSummary.length > 0 ? (
                <ol className="space-y-2">
                  {activeCase.questionSummary.map((q, idx) => {
                    const crisisHit = q.isCrisisItem && Number(q.score) > 0;
                    return (
                      <li
                        key={idx}
                        className={`flex items-start justify-between gap-3 rounded-md border p-3 ${
                          crisisHit
                            ? "border-[color:var(--mb-urgent)] bg-[color:var(--mb-urgent-bg)] text-[color:var(--mb-urgent)]"
                            : "border-[color:var(--mb-line)] bg-[color:var(--mb-ground)] text-[color:var(--mb-ink)]"
                        }`}
                      >
                        <p className="min-w-0 flex-1">
                          <span className="mr-2 font-bold">{idx + 1}.</span>
                          {q.text}
                          {q.isCrisisItem && (
                            <span className="ml-2 inline-block rounded border border-current px-2 text-xs font-bold uppercase">
                              Safety question
                            </span>
                          )}
                        </p>
                        <p className="shrink-0 font-display text-xl font-bold tabular-nums">{q.score ?? "—"}</p>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="text-[color:var(--mb-muted)]">No per-question breakdown was saved for this check-in.</p>
              )}
            </section>

            <section aria-labelledby="contact-heading" className="mb-tile">
              <h3 id="contact-heading" className="mb-2 text-lg font-bold text-[color:var(--mb-ink)]">
                Emergency contact
              </h3>
              {loadingContact ? (
                <p className="flex items-center gap-2 text-[color:var(--mb-muted)]">
                  <Spinner size={14} /> Loading contact details…
                </p>
              ) : studentContact?.emergencyContact?.name ? (
                <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  <div className="flex gap-2">
                    <dt className="text-[color:var(--mb-muted)]">Name</dt>
                    <dd className="font-bold text-[color:var(--mb-ink)]">{studentContact.emergencyContact.name}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-[color:var(--mb-muted)]">Relationship</dt>
                    <dd className="font-bold text-[color:var(--mb-ink)]">
                      {studentContact.emergencyContact.relationship}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-[color:var(--mb-muted)]">Phone</dt>
                    <dd className="font-mono font-bold">
                      <a
                        className="text-[color:var(--mb-brand)] underline"
                        href={`tel:${studentContact.emergencyContact.phone}`}
                      >
                        {studentContact.emergencyContact.phone}
                      </a>
                    </dd>
                  </div>
                  {studentContact.emergencyContact.alternatePhone && (
                    <div className="flex gap-2">
                      <dt className="text-[color:var(--mb-muted)]">Alternate</dt>
                      <dd className="font-mono font-bold">
                        <a
                          className="text-[color:var(--mb-brand)] underline"
                          href={`tel:${studentContact.emergencyContact.alternatePhone}`}
                        >
                          {studentContact.emergencyContact.alternatePhone}
                        </a>
                      </dd>
                    </div>
                  )}
                  {studentContact.emergencyContact.notes && (
                    <div className="sm:col-span-2">
                      <dt className="inline text-[color:var(--mb-muted)]">Notes </dt>
                      <dd className="inline text-[color:var(--mb-ink)]">{studentContact.emergencyContact.notes}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="text-[color:var(--mb-muted)]">
                  This student has not added an emergency contact in their settings.
                </p>
              )}
            </section>

            <section aria-labelledby="notes-heading">
              <h3 id="notes-heading" className="mb-2 text-lg font-bold text-[color:var(--mb-ink)]">
                Confidential case notes
              </h3>
              <label htmlFor="case-notes" className="sr-only">
                Case notes
              </label>
              <textarea
                id="case-notes"
                rows={4}
                value={counselorNoteInput}
                onChange={(e) => setCounselorNoteInput(e.target.value)}
                placeholder="Assessment, outreach taken, sessions scheduled…"
                className="mb-field"
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Case status">
                  <span className="font-bold text-[color:var(--mb-ink)]">Status</span>
                  {(["open", "reviewed", "escalated"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => markAssessmentStatus(activeCase.id, st)}
                      disabled={Boolean(updatingAssessmentId)}
                      aria-pressed={(activeCase.status || "open") === st}
                      className={`min-h-[44px] rounded-md border px-3 font-bold capitalize transition-colors disabled:opacity-60 ${
                        (activeCase.status || "open") === st
                          ? "border-[color:var(--mb-panel)] bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)]"
                          : "border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] text-[color:var(--mb-ink)] hover:border-[color:var(--mb-muted)]"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="mb-btn mb-btn-solid !px-4 text-sm"
                >
                  {savingNotes && <Spinner size={14} />}
                  {savingNotes ? "Saving…" : "Save notes"}
                </button>
              </div>
            </section>
          </div>
        )}
      </Modal>

      {/* Confidential Chat Modal */}
      {chatStudent && (
        <Suspense fallback={null}>
          <ConfidentialChatModal
            isOpen={Boolean(chatStudent)}
            onClose={() => setChatStudent(null)}
            studentId={chatStudent.id}
            recipientName={chatStudent.name}
            recipientRole="student"
          />
        </Suspense>
      )}
    </div>
  );
}

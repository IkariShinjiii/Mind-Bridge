import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  HeartPulse,
  Sprout,
  Sparkles,
  Calendar,
  TrendingUp,
  BarChart2,
  Target,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  getAppointments,
  bookAppointment,
  submitResponse,
  getAvailability,
  getMyAssessments,
} from "../api";
import { useAuth } from "../AuthContext.jsx";
import Spinner from "./Spinner";
import ConfidentialChatModal from "./ConfidentialChatModal";

// Safely formats dates to prevent the "Invalid Date" error
function safeFormatDate(val) {
  if (!val) return null;
  if (typeof val === "string" && !val.includes("-") && !val.includes("/")) return val;
  const date = new Date(val);
  return Number.isNaN(date.getTime())
    ? val
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function formatShortDate(val) {
  if (!val) return "";
  const date = new Date(val);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Validated Clinical Screening Item Bank (PHQ-9 & GAD-7 Dual-Scale)
const SCREENING_QUESTIONS = [
  {
    id: "q1",
    text: "Little interest or pleasure in doing academic or daily activities",
    subtext: "Over the last 2 weeks",
    isCrisisItem: false,
  },
  {
    id: "q2",
    text: "Feeling down, depressed, overwhelmed, or hopeless",
    subtext: "Over the last 2 weeks",
    isCrisisItem: false,
  },
  {
    id: "q3",
    text: "Trouble falling or staying asleep, or sleeping excessively",
    subtext: "Over the last 2 weeks",
    isCrisisItem: false,
  },
  {
    id: "q4",
    text: "Feeling nervous, anxious, or constantly on edge",
    subtext: "Over the last 2 weeks",
    isCrisisItem: false,
  },
  {
    id: "q5",
    text: "Not being able to stop or control worrying",
    subtext: "Over the last 2 weeks",
    isCrisisItem: false,
  },
  {
    id: "q6",
    text: "Trouble concentrating on lectures, schoolwork, or reading",
    subtext: "Over the last 2 weeks",
    isCrisisItem: false,
  },
  {
    id: "q7",
    text: "Thoughts that you would be better off not around, or hurting yourself in some way",
    subtext: "Confidential immediate safety screening item",
    isCrisisItem: true,
  },
];

const SCALE_OPTIONS = [
  { value: 0, label: "0 - Not at all", desc: "Never in the past 2 weeks" },
  { value: 1, label: "1 - Several days", desc: "A few times" },
  { value: 2, label: "2 - More than half the days", desc: "Frequent" },
  { value: 3, label: "3 - Nearly every day", desc: "Almost daily" },
];

export default function StudentDashboard() {
  const { currentUser, userData } = useAuth();
  const userName = userData?.name || currentUser?.displayName || "Student";
  const displayName = userName.split(" ")[0] || "Student";

  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState(Array(SCREENING_QUESTIONS.length).fill(null));
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [lastSubmission, setLastSubmission] = useState(null);
  const [submittingSurvey, setSubmittingSurvey] = useState(false);

  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  const [pastAssessments, setPastAssessments] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [trendView, setTrendView] = useState("chart"); // 'chart' | 'table'

  // Modal & Slot Booking States
  const [showModal, setShowModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingId, setBookingId] = useState(null);

  // Confidential Chat State
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoadingAppointments(true);
      setLoadingHistory(true);
      try {
        const [apts, history] = await Promise.all([
          getAppointments().catch(() => []),
          getMyAssessments().catch(() => []),
        ]);
        if (!mounted) return;
        setAppointments(Array.isArray(apts) ? apts : []);
        setPastAssessments(Array.isArray(history) ? history : []);
      } catch (err) {
        console.error("Failed to load student dashboard data", err);
      } finally {
        if (mounted) {
          setLoadingAppointments(false);
          setLoadingHistory(false);
        }
      }
    }
    loadData();
    return () => (mounted = false);
  }, []);

  async function openBookingModal() {
    setShowModal(true);
    setLoadingSlots(true);
    try {
      const slots = await getAvailability();
      // Filter out slots that are already booked
      setAvailableSlots(slots.filter((s) => !s.isBooked));
    } catch (err) {
      console.error("Failed to fetch availability", err);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleBookSlot(slot) {
    setBookingId(slot.id);
    try {
      await bookAppointment(slot);
      const fresh = await getAppointments();
      setAppointments(Array.isArray(fresh) ? fresh : []);
      setShowModal(false);
    } catch (err) {
      console.error("Booking failed", err);
    } finally {
      setBookingId(null);
    }
  }

  function selectOption(value) {
    const copy = [...answers];
    copy[qIndex] = value;
    setAnswers(copy);
  }

  async function handleNext() {
    if (qIndex < SCREENING_QUESTIONS.length - 1) {
      setQIndex(qIndex + 1);
    } else {
      setSubmittingSurvey(true);
      try {
        // Crisis detection rule: Question 7 (index 6) > 0 triggers immediate review
        const crisisScore = Number(answers[6] || 0);
        const flaggedForImmediateReview = crisisScore > 0;

        const result = await submitResponse(answers, {
          questions: SCREENING_QUESTIONS,
          flaggedForImmediateReview,
        });

        setLastSubmission(result);
        setSurveyCompleted(true);

        // Refresh past assessments list
        const freshHistory = await getMyAssessments().catch(() => []);
        setPastAssessments(Array.isArray(freshHistory) ? freshHistory : []);
      } catch (error) {
        console.error("Failed to submit survey", error);
      } finally {
        setSubmittingSurvey(false);
      }
    }
  }

  function resetCheckIn() {
    setAnswers(Array(SCREENING_QUESTIONS.length).fill(null));
    setQIndex(0);
    setSurveyCompleted(false);
    setLastSubmission(null);
  }

  const answeredCount = answers.filter((a) => a !== null).length;
  const progressPct = Math.round((answeredCount / SCREENING_QUESTIONS.length) * 100);

  const currentQ = SCREENING_QUESTIONS[qIndex];
  const latestAssessment = pastAssessments[0] || lastSubmission;
  const latestRisk = lastSubmission?.riskLevel || latestAssessment?.riskLevel || "low";
  const latestScore =
    lastSubmission?.total !== undefined
      ? lastSubmission.total
      : latestAssessment?.total !== undefined
      ? latestAssessment.total
      : null;
  const maxScore = latestAssessment?.maxScore || 21;

  // Prepare chronological chart data
  const chartData = useMemo(() => {
    if (!pastAssessments.length) return [];
    // Sort oldest to newest
    const sorted = [...pastAssessments].sort(
      (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    );

    return sorted.map((item, index) => {
      const score = Number.isFinite(item.total) ? item.total : 0;
      return {
        id: item.id || `checkin-${index}`,
        rawDate: item.createdAt,
        formattedDate: formatShortDate(item.createdAt) || `Check-in ${index + 1}`,
        fullDate: safeFormatDate(item.createdAt),
        score,
        riskLevel: item.riskLevel || "low",
        max: item.maxScore || 21,
      };
    });
  }, [pastAssessments]);

  // Insights computation
  const trendInsight = useMemo(() => {
    if (chartData.length < 2) return null;
    const latest = chartData[chartData.length - 1].score;
    const prev = chartData[chartData.length - 2].score;
    const diff = latest - prev;

    if (diff < 0) {
      return {
        direction: "improving",
        text: `↓ ${Math.abs(diff)} pts lower than previous check-in (Improving)`,
        color: "text-[color:var(--mb-safe)]",
      };
    } else if (diff > 0) {
      return {
        direction: "elevated",
        text: `↑ ${diff} pts higher distress than previous check-in`,
        color: "text-[color:var(--mb-warn)]",
      };
    } else {
      return {
        direction: "stable",
        text: "→ Stress levels unchanged since last check-in",
        color: "text-[color:var(--mb-brand)]",
      };
    }
  }, [chartData]);

  // Gauge Percentage
  const gaugePct = latestScore !== null ? Math.min(100, Math.round((latestScore / maxScore) * 100)) : 0;

  // Assigned Counselor info
  const assignedCounselorId =
    userData?.assignedCounselorId || appointments[0]?.counselorId || "general_counselor";
  const assignedCounselorName =
    userData?.assignedCounselorName || appointments[0]?.counselorName || "USA Guidance Counselor";

  return (
    <div className="space-y-6 animate-fade-up relative">
      {/* Top Welcome Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[color:var(--mb-ink)] tracking-tight">
          Welcome back, {displayName}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[color:var(--mb-brand)]">
          How are you feeling today? Take a quick confidential check-in.
        </p>
      </div>

      {/* Main 2-Column Dashboard Grid */}
      <div className="flex flex-col gap-6 lg:flex-row items-start">
        <section className="lg:w-2/3 flex flex-col gap-6 w-full">
          {/* Quick Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Gauge / Status Card */}
          <div className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="text-[11px] text-[color:var(--mb-muted)] uppercase tracking-wider font-semibold">
                Latest Wellness Index
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-[color:var(--mb-ink)]">
                    {latestScore !== null ? `${latestScore} / ${maxScore}` : "No check-in"}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        latestRisk === "high"
                          ? "bg-[color:var(--mb-urgent-solid)] animate-pulse"
                          : latestRisk === "medium"
                          ? "bg-[color:var(--mb-amber)]"
                          : "bg-[color:var(--mb-safe-solid)]"
                      }`}
                    />
                    <span className="text-xs font-semibold capitalize text-[color:var(--mb-ink)]">
                      {latestRisk === "high"
                        ? "Needs Attention"
                        : latestRisk === "medium"
                        ? "Elevated Stress"
                        : "Balanced / Stable"}
                    </span>
                  </div>
                </div>

                {/* Mini Visual Gauge */}
                {latestScore !== null && (
                  <div className="relative h-12 w-12 shrink-0">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-[color:var(--mb-muted)]"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={
                          latestRisk === "high"
                            ? "text-red-500"
                            : latestRisk === "medium"
                            ? "text-amber-400"
                            : "text-[color:var(--mb-brand)]"
                        }
                        strokeDasharray={`${gaugePct}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[color:var(--mb-ink)]">
                      {gaugePct}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {trendInsight && (
              <div className={`mt-2 text-[11px] font-medium ${trendInsight.color} truncate`}>
                {trendInsight.text}
              </div>
            )}
          </div>

          {/* Next Appointment Card */}
          <div className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-[11px] text-[color:var(--mb-muted)] uppercase tracking-wider font-semibold">
                Next Appointment
              </div>
              <div className="mt-2 text-sm sm:text-base font-semibold text-[color:var(--mb-ink)] truncate">
                {appointments.length > 0
                  ? safeFormatDate(appointments[0].start || appointments[0].date)
                  : "None scheduled"}
              </div>
            </div>
            <div className="mt-2 text-[11px] text-[color:var(--mb-muted)] flex items-center justify-between">
              <span>Status:</span>
              <span className="font-semibold text-[color:var(--mb-brand)] capitalize">
                {appointments[0]?.status || "Open"}
              </span>
            </div>
          </div>

          {/* Assigned Counselor Card */}
          <div className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-[11px] text-[color:var(--mb-muted)] uppercase tracking-wider font-semibold flex items-center justify-between">
                <span>Guidance Counselor</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-brand)] border border-[color:var(--mb-brand)] font-semibold uppercase">
                  Assigned
                </span>
              </div>
              <div className="mt-2 font-semibold text-[color:var(--mb-ink)] text-sm truncate">
                {assignedCounselorName}
              </div>
              <div className="mt-0.5 text-[11px] text-[color:var(--mb-muted)]">
                100% confidential student channel
              </div>
            </div>
            <button
              onClick={() => setChatOpen(true)}
              className="mt-2 text-[11px] font-semibold text-[color:var(--mb-brand)] hover:text-[color:var(--mb-brand)] flex items-center gap-1.5 self-start interactive-tap"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Message Counselor</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* WELLNESS SURVEY */}
        <div className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-5 sm:p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-md bg-[color:var(--mb-brand-bg)] border border-[color:var(--mb-brand)] flex items-center justify-center">
                <Activity className="h-4 w-4 text-[color:var(--mb-brand)]" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-[color:var(--mb-ink)]">Wellness Check-in</h2>
                <p className="text-xs text-[color:var(--mb-muted)]">Validated PHQ-9 & GAD-7 screening • Takes ~1 min</p>
                <p className="text-[10px] text-[color:var(--mb-muted)] mt-1 max-w-sm">By participating, you consent to the collection and processing of your wellness data for triage and support purposes.</p>
              </div>
            </div>
            {!surveyCompleted && (
              <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-brand)] border border-[color:var(--mb-brand)]">
                {answeredCount}/{SCREENING_QUESTIONS.length}
              </div>
            )}
          </div>

          {surveyCompleted ? (
            <div className="space-y-6 animate-fade-up">
              {/* Empathetic Result Card */}
              <div
                className={`rounded-md border p-5 sm:p-6 text-center ${
                  lastSubmission?.riskLevel === "high" || lastSubmission?.flaggedForImmediateReview
                    ? "border-[color:var(--mb-urgent)] bg-[color:var(--mb-urgent-bg)]"
                    : lastSubmission?.riskLevel === "medium"
                    ? "border-[color:var(--mb-warn)] bg-[color:var(--mb-warn-bg)]"
                    : "border-[color:var(--mb-safe)] bg-[color:var(--mb-safe-bg)]"
                }`}
              >
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--mb-surface)] shadow-inner">
                  {lastSubmission?.riskLevel === "high" ? (
                    <HeartPulse className="h-7 w-7 text-[color:var(--mb-urgent)]" />
                  ) : lastSubmission?.riskLevel === "medium" ? (
                    <Sprout className="h-7 w-7 text-[color:var(--mb-warn)]" />
                  ) : (
                    <Sparkles className="h-7 w-7 text-[color:var(--mb-safe)]" />
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[color:var(--mb-ink)]">
                  {lastSubmission?.riskLevel === "high" || lastSubmission?.flaggedForImmediateReview
                    ? "We're here with you — You don't have to carry this alone."
                    : lastSubmission?.riskLevel === "medium"
                    ? "Thank you for checking in — Take some time to breathe."
                    : "Check-in Complete — You're doing great!"}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[color:var(--mb-muted)] max-w-lg mx-auto leading-relaxed">
                  {lastSubmission?.riskLevel === "high" || lastSubmission?.flaggedForImmediateReview
                    ? "Your responses suggest you may be navigating heavy stress or emotional distress. A University Counselor has been prioritized to review your status in complete confidence."
                    : lastSubmission?.riskLevel === "medium"
                    ? "Your answers indicate elevated stress levels. Practicing self-care routines or speaking with a campus counselor can help navigate academic pressures."
                    : "Your answers show a stable wellness baseline. Continue your healthy routines, and remember support is always here if things change."}
                </p>

                {/* Crisis Support Hotlines Banner (Philippines & Campus) */}
                {(lastSubmission?.riskLevel === "high" || lastSubmission?.flaggedForImmediateReview) && (
                  <div className="mt-5 rounded-md border border-[color:var(--mb-urgent)] bg-[color:var(--mb-ground)] p-4 text-left">
                    <div className="flex items-center gap-2 text-[color:var(--mb-urgent)] font-semibold text-xs sm:text-sm mb-2">
                      <HeartPulse className="h-4 w-4 text-[color:var(--mb-urgent)] shrink-0" />
                      <span>Immediate Crisis Support Resources (Free & 24/7)</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-[color:var(--mb-muted)]">
                      <li>
                        • <strong>NCMH National Crisis Hotline:</strong> Dial{" "}
                        <span className="text-[color:var(--mb-brand)] font-mono font-semibold">1553</span> (Toll-Free) or{" "}
                        <span className="text-[color:var(--mb-brand)] font-mono">0917-899-8727</span>
                      </li>
                      <li>
                        • <strong>Hopeline Philippines:</strong>{" "}
                        <span className="text-[color:var(--mb-brand)] font-mono">0917-558-4673</span> /{" "}
                        <span className="text-[color:var(--mb-brand)] font-mono">(02) 8804-4673</span>
                      </li>
                      <li>
                        • <strong>USA Center for Guidance & Counseling:</strong> Inquire directly through Mind Bridge or visit the Guidance Office.
                      </li>
                    </ul>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={openBookingModal}
                    className="inline-flex items-center gap-2 rounded-md bg-[color:var(--mb-panel)] px-5 py-2.5 text-xs sm:text-sm font-semibold text-[color:var(--mb-panel-ink)] transition hover:bg-[color:var(--mb-panel)] shadow-sm interactive-tap"
                  >
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>Book Counselor Session</span>
                  </button>
                  <button
                    onClick={resetCheckIn}
                    className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] px-4 py-2.5 text-xs sm:text-sm font-medium text-[color:var(--mb-muted)] hover:bg-[color:var(--mb-line)] transition"
                  >
                    Take Check-in Again
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Progress Bar */}
              <div className="mb-5 w-full h-2 overflow-hidden rounded-full bg-[color:var(--mb-surface-2)]">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {/* Current Question */}
              <div className="mb-5">
                <div className="text-[11px] uppercase tracking-wider text-[color:var(--mb-brand)] font-semibold mb-1">
                  Question {qIndex + 1} of {SCREENING_QUESTIONS.length}{" "}
                  {currentQ.isCrisisItem && "• Safety Item"}
                </div>
                <p className="text-base sm:text-lg font-medium text-[color:var(--mb-ink)]">{currentQ.text}</p>
                <p className="text-xs text-[color:var(--mb-muted)] mt-0.5">{currentQ.subtext}</p>
              </div>

              {/* Options */}
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {SCALE_OPTIONS.map((opt) => {
                  const isSelected = answers[qIndex] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => selectOption(opt.value)}
                      className={`rounded-md p-3.5 sm:p-4 text-left transition transform focus:outline-none ${
                        isSelected
                          ? "bg-[color:var(--mb-panel)] border border-[color:var(--mb-brand)] text-[color:var(--mb-panel-ink)] shadow-sm scale-[1.01]"
                          : "border border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] text-[color:var(--mb-muted)] hover:border-[color:var(--mb-line)] hover:bg-[color:var(--mb-line)]"
                      }`}
                    >
                      <div className="font-semibold text-xs sm:text-sm">{opt.label}</div>
                      <div className={`text-[11px] sm:text-xs mt-1 ${isSelected ? "text-[color:var(--mb-brand)]" : "text-[color:var(--mb-muted)]"}`}>
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[color:var(--mb-line)]">
                <button
                  onClick={() => setQIndex(Math.max(0, qIndex - 1))}
                  disabled={qIndex === 0}
                  className="rounded-md px-4 py-2 text-xs sm:text-sm text-[color:var(--mb-muted)] hover:bg-[color:var(--mb-surface-2)] hover:text-[color:var(--mb-ink)] disabled:opacity-30 transition"
                >
                  Previous
                </button>
                <button
                  onClick={handleNext}
                  disabled={answers[qIndex] === null || submittingSurvey}
                  className="inline-flex items-center gap-2 rounded-md bg-[color:var(--mb-panel)] px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-semibold text-[color:var(--mb-panel-ink)] transition hover:bg-[color:var(--mb-panel)] disabled:opacity-50 shadow-sm"
                >
                  {submittingSurvey ? (
                    <>
                      <Spinner size={14} className="text-[color:var(--mb-ink)]" />
                      <span>Evaluating…</span>
                    </>
                  ) : qIndex === SCREENING_QUESTIONS.length - 1 ? (
                    "Submit Assessment"
                  ) : (
                    "Next Question →"
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* WELLNESS TREND LINE CHART & HISTORY SECTION */}
        <div className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-5 sm:p-6 shadow-sm">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-md bg-[color:var(--mb-brand-bg)] border border-[color:var(--mb-brand)] flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-[color:var(--mb-brand)]" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[color:var(--mb-ink)]">
                  My Wellness Distress Trend
                </h3>
              </div>
              <p className="text-xs text-[color:var(--mb-muted)] mt-0.5">
                Track your PHQ-9 & GAD-7 score trajectory across screening check-ins.
              </p>
            </div>

            {pastAssessments.length > 0 && (
              <div className="flex items-center rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-ground)] p-1 self-start">
                <button
                  onClick={() => setTrendView("chart")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                    trendView === "chart"
                      ? "bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)] shadow-sm"
                      : "text-[color:var(--mb-muted)] hover:text-[color:var(--mb-ink)]"
                  }`}
                >
                  Chart
                </button>
                <button
                  onClick={() => setTrendView("table")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                    trendView === "table"
                      ? "bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)] shadow-sm"
                      : "text-[color:var(--mb-muted)] hover:text-[color:var(--mb-ink)]"
                  }`}
                >
                  History Log
                </button>
              </div>
            )}
          </div>

          {loadingHistory ? (
            <div className="flex h-56 items-center justify-center text-xs text-[color:var(--mb-muted)] gap-2">
              <Spinner size={16} /> Loading wellness trend data...
            </div>
          ) : chartData.length === 0 ? (
            <div className="rounded-md border border-dashed border-[color:var(--mb-line)] p-8 text-center text-[color:var(--mb-muted)]">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--mb-surface-2)] text-lg">
                <BarChart2 className="h-5 w-5 text-[color:var(--mb-muted)]" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-[color:var(--mb-ink)]">No Check-in Data Yet</p>
              <p className="text-xs text-[color:var(--mb-muted)] mt-1 max-w-sm mx-auto">
                Complete your first 1-minute wellness check-in above to begin tracking your distress
                index over time.
              </p>
            </div>
          ) : trendView === "chart" ? (
            <div>
              {/* Score Benchmark Legend */}
              <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] text-[color:var(--mb-muted)]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[color:var(--mb-safe-solid)]" />
                  <span>0 - 6: Balanced</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[color:var(--mb-amber)]" />
                  <span>7 - 12: Moderate Distress</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[color:var(--mb-urgent-solid)]" />
                  <span>13 - 21: High / Priority</span>
                </span>
              </div>

              {/* Area Line Chart */}
              <div className="h-60 sm:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--mb-brand)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--mb-brand)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--mb-line)" vertical={false} />
                    <XAxis
                      dataKey="formattedDate"
                      stroke="var(--mb-muted)"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[0, 21]}
                      stroke="var(--mb-muted)"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-3 shadow-sm text-xs">
                              <div className="font-semibold text-[color:var(--mb-ink)]">{data.fullDate || data.formattedDate}</div>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-[color:var(--mb-brand)] font-bold text-sm">
                                  Score: {data.score} / {data.max}
                                </span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                    data.riskLevel === "high"
                                      ? "bg-[color:var(--mb-urgent-bg)] text-[color:var(--mb-urgent)]"
                                      : data.riskLevel === "medium"
                                      ? "bg-[color:var(--mb-warn-bg)] text-[color:var(--mb-warn)]"
                                      : "bg-[color:var(--mb-safe-bg)] text-[color:var(--mb-safe)]"
                                  }`}
                                >
                                  {data.riskLevel}
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine y={6} stroke="#10b981" strokeDasharray="3 3" opacity={0.4} />
                    <ReferenceLine y={12} stroke="#f59e0b" strokeDasharray="3 3" opacity={0.4} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="var(--mb-brand)"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#scoreGradient)"
                      activeDot={{ r: 6, fill: "var(--mb-brand)", stroke: "var(--mb-surface)", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            /* Table History View */
            <div className="space-y-2">
              {pastAssessments.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-ground)] p-3 text-xs"
                >
                  <div>
                    <span className="font-medium text-[color:var(--mb-ink)]">{safeFormatDate(item.createdAt)}</span>
                    <span className="ml-2 text-[color:var(--mb-muted)]">
                      Score: <strong className="text-[color:var(--mb-brand)]">{item.total}</strong> / {item.maxScore || 21}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      item.riskLevel === "high"
                        ? "bg-[color:var(--mb-urgent-bg)] text-[color:var(--mb-urgent)] border border-[color:var(--mb-urgent)]"
                        : item.riskLevel === "medium"
                        ? "bg-[color:var(--mb-warn-bg)] text-[color:var(--mb-warn)] border border-[color:var(--mb-warn)]"
                        : "bg-[color:var(--mb-safe-bg)] text-[color:var(--mb-safe)] border border-[color:var(--mb-safe)]"
                    }`}
                  >
                    {item.riskLevel} Risk
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ASIDE: UPCOMING APPOINTMENTS & GOALS */}
      <aside className="lg:w-1/3 space-y-6 w-full">
        <div className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base sm:text-lg font-bold text-[color:var(--mb-ink)] flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[color:var(--mb-brand)]" />
              <span>Counseling Sessions</span>
            </h3>
            <Link
              to="/appointments"
              className="text-xs text-[color:var(--mb-brand)] hover:text-[color:var(--mb-brand)] font-medium transition"
            >
              View all
            </Link>
          </div>

          <div className="space-y-2.5">
            {loadingAppointments ? (
              <div className="flex items-center gap-2 text-xs text-[color:var(--mb-muted)] py-4">
                <Spinner size={14} /> Loading sessions...
              </div>
            ) : appointments.length === 0 ? (
              <div className="rounded-md border border-dashed border-[color:var(--mb-line)] p-4 text-center text-xs text-[color:var(--mb-muted)]">
                No active appointments scheduled.
              </div>
            ) : (
              appointments.slice(0, 3).map((apt) => (
                <div key={apt.id} className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-ground)] p-3 text-xs">
                  <div className="flex justify-between items-start gap-2">
                    <div className="font-semibold text-[color:var(--mb-ink)] truncate">
                      {apt.title || "Counseling Session"}
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        (apt.status || "").toLowerCase().includes("confirm")
                          ? "bg-[color:var(--mb-safe-bg)] text-[color:var(--mb-safe)] border border-[color:var(--mb-safe)]"
                          : (apt.status || "").toLowerCase().includes("pending")
                          ? "bg-[color:var(--mb-warn-bg)] text-[color:var(--mb-warn)] border border-[color:var(--mb-warn)]"
                          : "bg-[color:var(--mb-surface-2)] text-[color:var(--mb-muted)]"
                      }`}
                    >
                      {apt.status || "Pending"}
                    </span>
                  </div>
                  <div className="mt-1 text-[color:var(--mb-muted)]">
                    {safeFormatDate(apt.start || apt.date) || "Scheduled"}
                  </div>
                  {apt.counselorName && (
                    <div className="mt-0.5 text-[color:var(--mb-brand)] font-medium">
                      With {apt.counselorName}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <button
            onClick={openBookingModal}
            className="mt-4 w-full rounded-md bg-[color:var(--mb-panel)] px-4 py-2.5 text-xs sm:text-sm font-semibold text-[color:var(--mb-panel-ink)] transition hover:bg-[color:var(--mb-panel)] shadow-sm interactive-tap"
          >
            + Book Counseling Slot
          </button>
        </div>

        {/* My Wellness Focus Goals */}
        <div className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base sm:text-lg font-bold text-[color:var(--mb-ink)] flex items-center gap-2">
              <Target className="h-5 w-5 text-[color:var(--mb-brand)]" />
              <span>My Wellness Goals</span>
            </h3>
            <Link
              to="/settings"
              className="text-xs text-[color:var(--mb-brand)] hover:text-[color:var(--mb-brand)] transition-colors font-medium"
            >
              Edit in Settings
            </Link>
          </div>

          {Array.isArray(userData?.wellnessGoals) && userData.wellnessGoals.length > 0 ? (
            <div className="space-y-2">
              {userData.wellnessGoals.map((goal, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-ground)] p-2.5 text-xs text-[color:var(--mb-ink)]"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-brand)] text-[10px] font-bold">
                    ✓
                  </span>
                  <span className="truncate">{goal}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-[color:var(--mb-line)] p-4 text-center text-xs text-[color:var(--mb-muted)]">
              No focus goals chosen yet.{" "}
              <Link to="/settings" className="text-[color:var(--mb-brand)] hover:underline">
                Pick focus goals
              </Link>
            </div>
          )}
        </div>
      </aside>
    </div>

      {/* BOOKING MODAL FOR LIVE COUNSELOR SLOTS */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80  p-4 animate-fade-up">
          <div className="w-full max-w-lg rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-[color:var(--mb-line)] pb-3">
              <div>
                <h3 className="text-lg font-bold text-[color:var(--mb-ink)]">Select Available Counselor Slot</h3>
                <p className="text-xs text-[color:var(--mb-muted)] mt-0.5">Confidential 1-on-1 guidance</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-[color:var(--mb-muted)] hover:text-[color:var(--mb-ink)] text-xl">
                ✕
              </button>
            </div>

            {loadingSlots ? (
              <div className="py-8 text-center text-[color:var(--mb-muted)] flex items-center justify-center gap-2 text-xs sm:text-sm">
                <Spinner size={16} /> Loading open slots...
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="py-8 text-center text-[color:var(--mb-muted)] border border-dashed border-[color:var(--mb-line)] rounded-md p-4 text-xs sm:text-sm">
                No open counselor time slots found at the moment. Please check back later or visit the Guidance Office.
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {availableSlots.map((slot) => {
                  const startTime = safeFormatDate(slot.start || slot.date || slot.time);
                  const endTime = safeFormatDate(slot.end || slot.to);

                  return (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] p-3.5 sm:p-4 text-xs sm:text-sm"
                    >
                      <div>
                        <div className="font-medium text-[color:var(--mb-ink)]">
                          Counselor: {slot.counselorName || "Assigned Counselor"}
                        </div>
                        <div className="text-[color:var(--mb-brand)] mt-0.5 font-medium text-xs">
                          {startTime || "Unknown Time"} {endTime ? `to ${endTime}` : ""}
                        </div>
                      </div>
                      <button
                        onClick={() => handleBookSlot(slot)}
                        disabled={bookingId === slot.id}
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-[color:var(--mb-panel)] px-4 py-2 text-xs font-semibold text-[color:var(--mb-panel-ink)] hover:bg-[color:var(--mb-panel)] disabled:opacity-50"
                      >
                        {bookingId === slot.id ? <Spinner size={14} /> : "Book Slot"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-5 flex justify-end pt-3 border-t border-[color:var(--mb-line)]">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-md border border-[color:var(--mb-line)] px-4 py-2 text-xs font-medium text-[color:var(--mb-muted)] hover:bg-[color:var(--mb-surface-2)] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIDENTIAL CHAT MODAL (STUDENT TO ASSIGNED COUNSELOR) */}
      {chatOpen && (
        <ConfidentialChatModal
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          studentId={currentUser?.uid}
          recipientName={assignedCounselorName}
          recipientRole="counselor"
        />
      )}
    </div>
  );
}
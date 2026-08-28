import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
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
        color: "text-emerald-400",
      };
    } else if (diff > 0) {
      return {
        direction: "elevated",
        text: `↑ ${diff} pts higher distress than previous check-in`,
        color: "text-amber-400",
      };
    } else {
      return {
        direction: "stable",
        text: "→ Stress levels unchanged since last check-in",
        color: "text-cyan-300",
      };
    }
  }, [chartData]);

  // Gauge Percentage
  const gaugePct = latestScore !== null ? Math.min(100, Math.round((latestScore / maxScore) * 100)) : 0;

  return (
    <div className="flex flex-col gap-6 lg:flex-row animate-fade-up relative">
      <section className="lg:w-2/3 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Welcome back, {displayName}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-cyan-200/80">
            How are you feeling today? Take a quick confidential check-in.
          </p>
        </div>

        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Gauge / Status Card */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/90 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                Latest Wellness Index
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">
                    {latestScore !== null ? `${latestScore} / ${maxScore}` : "No check-in"}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        latestRisk === "high"
                          ? "bg-red-400 animate-pulse"
                          : latestRisk === "medium"
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                      }`}
                    />
                    <span className="text-xs font-semibold capitalize text-gray-200">
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
                        className="text-gray-800"
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
                            : "text-cyan-400"
                        }
                        strokeDasharray={`${gaugePct}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
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

          <div className="rounded-2xl border border-gray-800 bg-gray-900/90 p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                Next Appointment
              </div>
              <div className="mt-2 text-sm sm:text-base font-semibold text-white truncate">
                {appointments.length > 0
                  ? safeFormatDate(appointments[0].start || appointments[0].date)
                  : "None scheduled"}
              </div>
            </div>
            <div className="mt-2 text-[11px] text-gray-400 flex items-center justify-between">
              <span>Status:</span>
              <span className="font-semibold text-cyan-300 capitalize">
                {appointments[0]?.status || "Open"}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900/90 p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                Confidential Support
              </div>
              <div className="mt-2 text-xs text-gray-300 line-clamp-2 leading-relaxed">
                {appointments[0]?.counselorName
                  ? `Assigned counselor: ${appointments[0].counselorName}`
                  : "USA Guidance Counseling services are 100% confidential and free."}
              </div>
            </div>
            <Link
              to="/resources"
              className="mt-2 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>View Crisis Resources</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* WELLNESS SURVEY */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/90 p-5 sm:p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🌿</span>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-white">Wellness Check-in</h2>
                <p className="text-xs text-gray-400">Validated PHQ-9 & GAD-7 screening • Takes ~1 min</p>
              </div>
            </div>
            {!surveyCompleted && (
              <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                {answeredCount}/{SCREENING_QUESTIONS.length}
              </div>
            )}
          </div>

          {surveyCompleted ? (
            <div className="space-y-6 animate-fade-up">
              {/* Empathetic Result Card */}
              <div
                className={`rounded-2xl border p-5 sm:p-6 text-center ${
                  lastSubmission?.riskLevel === "high" || lastSubmission?.flaggedForImmediateReview
                    ? "border-red-500/30 bg-red-500/10"
                    : lastSubmission?.riskLevel === "medium"
                    ? "border-amber-500/30 bg-amber-500/10"
                    : "border-emerald-500/30 bg-emerald-500/10"
                }`}
              >
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-900/90 text-2xl shadow-inner">
                  {lastSubmission?.riskLevel === "high" ? "❤️‍🩹" : lastSubmission?.riskLevel === "medium" ? "🌱" : "✨"}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  {lastSubmission?.riskLevel === "high" || lastSubmission?.flaggedForImmediateReview
                    ? "We're here with you — You don't have to carry this alone."
                    : lastSubmission?.riskLevel === "medium"
                    ? "Thank you for checking in — Take some time to breathe."
                    : "Check-in Complete — You're doing great!"}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-gray-300 max-w-lg mx-auto leading-relaxed">
                  {lastSubmission?.riskLevel === "high" || lastSubmission?.flaggedForImmediateReview
                    ? "Your responses suggest you may be navigating heavy stress or emotional distress. A University Counselor has been prioritized to review your status in complete confidence."
                    : lastSubmission?.riskLevel === "medium"
                    ? "Your answers indicate elevated stress levels. Practicing self-care routines or speaking with a campus counselor can help navigate academic pressures."
                    : "Your answers show a stable wellness baseline. Continue your healthy routines, and remember support is always here if things change."}
                </p>

                {/* Crisis Support Hotlines Banner (Philippines & Campus) */}
                {(lastSubmission?.riskLevel === "high" || lastSubmission?.flaggedForImmediateReview) && (
                  <div className="mt-5 rounded-xl border border-red-500/30 bg-gray-950/90 p-4 text-left">
                    <div className="flex items-center gap-2 text-red-400 font-semibold text-xs sm:text-sm mb-2">
                      <span>🆘</span>
                      <span>Immediate Crisis Support Resources (Free & 24/7)</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-gray-300">
                      <li>
                        • <strong>NCMH National Crisis Hotline:</strong> Dial{" "}
                        <span className="text-cyan-300 font-mono font-semibold">1553</span> (Toll-Free) or{" "}
                        <span className="text-cyan-300 font-mono">0917-899-8727</span>
                      </li>
                      <li>
                        • <strong>Hopeline Philippines:</strong>{" "}
                        <span className="text-cyan-300 font-mono">0917-558-4673</span> /{" "}
                        <span className="text-cyan-300 font-mono">(02) 8804-4673</span>
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
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-cyan-500 shadow-md"
                  >
                    <span>📅</span>
                    <span>Book Counselor Session</span>
                  </button>
                  <button
                    onClick={resetCheckIn}
                    className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-xs sm:text-sm font-medium text-gray-300 hover:bg-gray-700 transition"
                  >
                    Take Check-in Again
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Progress Bar */}
              <div className="mb-5 w-full h-2 overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {/* Current Question */}
              <div className="mb-5">
                <div className="text-[11px] uppercase tracking-wider text-cyan-400 font-semibold mb-1">
                  Question {qIndex + 1} of {SCREENING_QUESTIONS.length}{" "}
                  {currentQ.isCrisisItem && "• Safety Item"}
                </div>
                <p className="text-base sm:text-lg font-medium text-gray-100">{currentQ.text}</p>
                <p className="text-xs text-gray-400 mt-0.5">{currentQ.subtext}</p>
              </div>

              {/* Options */}
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {SCALE_OPTIONS.map((opt) => {
                  const isSelected = answers[qIndex] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => selectOption(opt.value)}
                      className={`rounded-xl p-3.5 sm:p-4 text-left transition transform focus:outline-none ${
                        isSelected
                          ? "bg-cyan-600 border border-cyan-400 text-white shadow-md scale-[1.01]"
                          : "border border-gray-800 bg-gray-800/80 text-gray-300 hover:border-gray-700 hover:bg-gray-700/80"
                      }`}
                    >
                      <div className="font-semibold text-xs sm:text-sm">{opt.label}</div>
                      <div className={`text-[11px] sm:text-xs mt-1 ${isSelected ? "text-cyan-100" : "text-gray-400"}`}>
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                <button
                  onClick={() => setQIndex(Math.max(0, qIndex - 1))}
                  disabled={qIndex === 0}
                  className="rounded-lg px-4 py-2 text-xs sm:text-sm text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-30 transition"
                >
                  Previous
                </button>
                <button
                  onClick={handleNext}
                  disabled={answers[qIndex] === null || submittingSurvey}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50 shadow-md"
                >
                  {submittingSurvey ? (
                    <>
                      <Spinner size={14} className="text-white" />
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
        <div className="rounded-2xl border border-gray-800 bg-gray-900/90 p-5 sm:p-6 shadow-xl">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">📈</span>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  My Wellness Distress Trend
                </h3>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Track your PHQ-9 & GAD-7 score trajectory across screening check-ins.
              </p>
            </div>

            {pastAssessments.length > 0 && (
              <div className="flex items-center rounded-xl border border-gray-800 bg-gray-950/60 p-1 self-start">
                <button
                  onClick={() => setTrendView("chart")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                    trendView === "chart"
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Chart
                </button>
                <button
                  onClick={() => setTrendView("table")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                    trendView === "table"
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  History Log
                </button>
              </div>
            )}
          </div>

          {loadingHistory ? (
            <div className="flex h-56 items-center justify-center text-xs text-gray-400 gap-2">
              <Spinner size={16} /> Loading wellness trend data...
            </div>
          ) : chartData.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-800 p-8 text-center text-gray-400">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-800/60 text-lg">
                📊
              </div>
              <p className="text-xs sm:text-sm font-medium text-white">No Check-in Data Yet</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Complete your first 1-minute wellness check-in above to begin tracking your distress
                index over time.
              </p>
            </div>
          ) : trendView === "chart" ? (
            <div>
              {/* Score Benchmark Legend */}
              <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>0 - 6: Balanced</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span>7 - 12: Moderate Distress</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
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
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis
                      dataKey="formattedDate"
                      stroke="#6b7280"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[0, 21]}
                      stroke="#6b7280"
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
                            <div className="rounded-xl border border-gray-700 bg-gray-900 p-3 shadow-xl text-xs">
                              <div className="font-semibold text-white">{data.fullDate || data.formattedDate}</div>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-cyan-300 font-bold text-sm">
                                  Score: {data.score} / {data.max}
                                </span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                    data.riskLevel === "high"
                                      ? "bg-red-500/20 text-red-300"
                                      : data.riskLevel === "medium"
                                      ? "bg-amber-500/20 text-amber-300"
                                      : "bg-emerald-500/20 text-emerald-300"
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
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#scoreGradient)"
                      activeDot={{ r: 6, fill: "#38bdf8", stroke: "#fff", strokeWidth: 2 }}
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
                  className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-950/60 p-3 text-xs"
                >
                  <div>
                    <span className="font-medium text-white">{safeFormatDate(item.createdAt)}</span>
                    <span className="ml-2 text-gray-400">
                      Score: <strong className="text-cyan-300">{item.total}</strong> / {item.maxScore || 21}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      item.riskLevel === "high"
                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                        : item.riskLevel === "medium"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
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
      <aside className="lg:w-1/3 space-y-5">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/90 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>📅</span>
              <span>Counseling Sessions</span>
            </h3>
            <Link
              to="/appointments"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition"
            >
              View all
            </Link>
          </div>

          <div className="space-y-2.5">
            {loadingAppointments ? (
              <div className="flex items-center gap-2 text-xs text-gray-400 py-4">
                <Spinner size={14} /> Loading sessions...
              </div>
            ) : appointments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-800 p-4 text-center text-xs text-gray-500">
                No active appointments scheduled.
              </div>
            ) : (
              appointments.slice(0, 3).map((apt) => (
                <div key={apt.id} className="rounded-xl border border-gray-800 bg-gray-950/60 p-3 text-xs">
                  <div className="flex justify-between items-start gap-2">
                    <div className="font-semibold text-white truncate">
                      {apt.title || "Counseling Session"}
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        (apt.status || "").toLowerCase().includes("confirm")
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : (apt.status || "").toLowerCase().includes("pending")
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-gray-800 text-gray-300"
                      }`}
                    >
                      {apt.status || "Pending"}
                    </span>
                  </div>
                  <div className="mt-1 text-gray-400">
                    {safeFormatDate(apt.start || apt.date) || "Scheduled"}
                  </div>
                  {apt.counselorName && (
                    <div className="mt-0.5 text-cyan-300/90 font-medium">
                      With {apt.counselorName}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <button
            onClick={openBookingModal}
            className="mt-4 w-full rounded-xl bg-cyan-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-cyan-500 shadow-md"
          >
            + Book Counseling Slot
          </button>
        </div>

        {/* My Wellness Focus Goals */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/90 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
              <span>🎯</span>
              <span>My Wellness Goals</span>
            </h3>
            <Link
              to="/settings"
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
            >
              Edit in Settings
            </Link>
          </div>

          {Array.isArray(userData?.wellnessGoals) && userData.wellnessGoals.length > 0 ? (
            <div className="space-y-2">
              {userData.wellnessGoals.map((goal, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-950/60 p-2.5 text-xs text-gray-200"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold">
                    ✓
                  </span>
                  <span className="truncate">{goal}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-800 p-4 text-center text-xs text-gray-500">
              No focus goals chosen yet.{" "}
              <Link to="/settings" className="text-cyan-400 hover:underline">
                Pick focus goals
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* BOOKING MODAL FOR LIVE COUNSELOR SLOTS */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-up">
          <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Select Available Counselor Slot</h3>
                <p className="text-xs text-gray-400 mt-0.5">Confidential 1-on-1 guidance</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-xl">
                ✕
              </button>
            </div>

            {loadingSlots ? (
              <div className="py-8 text-center text-gray-400 flex items-center justify-center gap-2 text-xs sm:text-sm">
                <Spinner size={16} /> Loading open slots...
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="py-8 text-center text-gray-400 border border-dashed border-gray-800 rounded-xl p-4 text-xs sm:text-sm">
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
                      className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-800/40 p-3.5 sm:p-4 text-xs sm:text-sm"
                    >
                      <div>
                        <div className="font-medium text-white">
                          Counselor: {slot.counselorName || "Assigned Counselor"}
                        </div>
                        <div className="text-cyan-300 mt-0.5 font-medium text-xs">
                          {startTime || "Unknown Time"} {endTime ? `to ${endTime}` : ""}
                        </div>
                      </div>
                      <button
                        onClick={() => handleBookSlot(slot)}
                        disabled={bookingId === slot.id}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
                      >
                        {bookingId === slot.id ? <Spinner size={14} /> : "Book Slot"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-5 flex justify-end pt-3 border-t border-gray-800">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-gray-700 px-4 py-2 text-xs font-medium text-gray-400 hover:bg-gray-800 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
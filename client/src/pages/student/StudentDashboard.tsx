import { lazy, Suspense, useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  HeartPulse,
  Sprout,
  Sparkles,
  Calendar,
  TrendingUp,
  BarChart2,
  Target,
  MessageSquare,
  ArrowRight,
  Check,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { getAppointments, bookAppointment, submitResponse, getAvailability, getMyAssessments } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import Spinner from "../../components/ui/Spinner";
const ConfidentialChatModal = lazy(() => import("../../components/chat/ConfidentialChatModal"));
import Modal from "../../components/ui/Modal";
import BookingFlow from "../../components/appointments/BookingFlow";
import { formatDateTime, parseDate } from "../../utils/dates";
import { validate } from "../../lib/validate";
import { checkInSchema } from "../../lib/schemas";
import { validateSlotForBooking } from "../../utils/booking";
import { friendlyError } from "../../utils/errors";
import type { Appointment, Assessment, AvailabilitySlot, ScreeningQuestion, StoredDate } from "../../types";

/**
 * Short axis label for the trend chart, e.g. "Oct 2".
 * @param {string|number|Date} val
 * @returns {string} empty when the value is not a date
 */
function formatShortDate(val: StoredDate): string {
  const date = parseDate(val);
  if (!date) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Validated Clinical Screening Item Bank (PHQ-9 & GAD-7 Dual-Scale)
const SCREENING_QUESTIONS: ScreeningQuestion[] = [
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

/** A fresh, unanswered check-in. */
const emptyAnswers = (): Array<number | null> => SCREENING_QUESTIONS.map(() => null);

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
  const [answers, setAnswers] = useState<Array<number | null>>(emptyAnswers);
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<Assessment | null>(null);
  const [submittingSurvey, setSubmittingSurvey] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  const [pastAssessments, setPastAssessments] = useState<Assessment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [trendView, setTrendView] = useState<"chart" | "table">("chart");

  // Modal & Slot Booking States
  const [showModal, setShowModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState("");

  // Confidential Chat State
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoadingAppointments(true);
      setLoadingHistory(true);
      try {
        const [apts, history] = await Promise.all([
          getAppointments().catch((): Appointment[] => []),
          getMyAssessments().catch((): Assessment[] => []),
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
    void loadData();
    return () => {
      mounted = false;
    };
  }, []);

  async function openBookingModal() {
    setShowModal(true);
    setLoadingSlots(true);
    setBookingError("");
    try {
      const slots = await getAvailability();
      // Filter out slots that are already booked
      setAvailableSlots(slots.filter((s) => !s.isBooked));
    } catch (err) {
      console.error("Failed to fetch availability", err);
      setBookingError("Could not load open slots. Close this and try again.");
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleBookSlot(slot: AvailabilitySlot) {
    const check = validateSlotForBooking(slot);
    if (!check.ok) {
      setBookingError(check.error.userMessage);
      return;
    }
    setBookingId(slot.id);
    setBookingError("");
    try {
      await bookAppointment(slot);
      const fresh = await getAppointments();
      setAppointments(Array.isArray(fresh) ? fresh : []);
      setShowModal(false);
    } catch (err) {
      console.error("Booking failed", err);
      setBookingError(friendlyError(err, "That slot could not be booked. It may have just been taken. Pick another."));
    } finally {
      setBookingId(null);
    }
  }

  function selectOption(value: number) {
    const copy = [...answers];
    copy[qIndex] = value;
    setAnswers(copy);
  }

  async function handleNext() {
    if (qIndex < SCREENING_QUESTIONS.length - 1) {
      setQIndex(qIndex + 1);
    } else {
      const check = validate(checkInSchema, { answers });
      if (!check.ok) {
        setSubmitError(check.error.userMessage);
        return;
      }
      setSubmittingSurvey(true);
      setSubmitError("");
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
        const freshHistory = await getMyAssessments().catch((): Assessment[] => []);
        setPastAssessments(Array.isArray(freshHistory) ? freshHistory : []);
      } catch (error) {
        console.error("Failed to submit survey", error);
        setSubmitError(
          friendlyError(error, "Your check-in could not be saved. Your answers are still here. Try submitting again."),
        );
      } finally {
        setSubmittingSurvey(false);
      }
    }
  }

  function resetCheckIn() {
    setAnswers(emptyAnswers());
    setQIndex(0);
    setSurveyCompleted(false);
    setLastSubmission(null);
  }

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
      (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
    );

    return sorted.map((item, index) => {
      const score = Number.isFinite(item.total) ? item.total : 0;
      return {
        id: item.id || `checkin-${index}`,
        rawDate: item.createdAt,
        formattedDate: formatShortDate(item.createdAt) || `Check-in ${index + 1}`,
        fullDate: formatDateTime(item.createdAt, ""),
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
  const assignedCounselorName =
    userData?.assignedCounselorName || appointments[0]?.counselorName || "USA Guidance Counselor";

  return (
    <div className="space-y-6 animate-fade-up relative">
      {/* Top Welcome Header */}
      <div className="border-b-2 border-[color:var(--mb-line)] pb-5">
        <h1 className="text-3xl font-bold text-[color:var(--mb-ink)] sm:text-4xl">Welcome back, {displayName}</h1>
        <p className="max-w-[65ch] text-[color:var(--mb-muted)]">
          How are you feeling today? Take a quick confidential check-in.
        </p>
      </div>

      {/* Main 2-Column Dashboard Grid */}
      <div className="flex flex-col gap-6 lg:flex-row items-start">
        <section className="lg:w-2/3 flex flex-col gap-6 w-full">
          {/* Quick Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
            {/* Gauge / Status Card */}
            <div className="rounded-md border-2 border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="text-sm text-[color:var(--mb-muted)] font-bold">Latest Wellness Index</div>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-[color:var(--mb-ink)]">
                      {latestScore !== null ? `${latestScore} / ${maxScore}` : "No check-in"}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className={`inline-block h-2.5 w-2.5 rounded-full ${
                          latestRisk === "high"
                            ? "bg-[color:var(--mb-urgent-solid)] motion-safe:animate-pulse"
                            : latestRisk === "medium"
                              ? "bg-[color:var(--mb-amber)]"
                              : "bg-[color:var(--mb-safe-solid)]"
                        }`}
                      />
                      <span className="text-sm font-bold text-[color:var(--mb-ink)]">
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
                      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
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
                              ? "text-[color:var(--mb-urgent-solid)]"
                              : latestRisk === "medium"
                                ? "text-[color:var(--mb-amber)]"
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
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[color:var(--mb-ink)]">
                        {gaugePct}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {trendInsight && (
                <div className={`mt-2 text-sm font-medium ${trendInsight.color}`}>{trendInsight.text}</div>
              )}
            </div>

            {/* Next Appointment Card */}
            <div className="rounded-md border-2 border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <div className="text-sm text-[color:var(--mb-muted)] font-bold">Next Appointment</div>
                <div className="mt-2 text-lg font-bold text-[color:var(--mb-ink)]">
                  {appointments.length > 0
                    ? formatDateTime(appointments[0].start || appointments[0].date)
                    : "None scheduled"}
                </div>
              </div>
              <div className="mt-2 text-sm text-[color:var(--mb-muted)] flex items-center justify-between">
                <span>Status:</span>
                <span className="font-bold text-[color:var(--mb-brand)] capitalize">
                  {appointments[0]?.status || "Open"}
                </span>
              </div>
            </div>

            {/* Assigned Counselor Card */}
            <div className="rounded-md border-2 border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <div className="text-sm text-[color:var(--mb-muted)] font-bold flex items-center justify-between">
                  <span>Guidance Counselor</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-md bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-brand)] border-2 border-[color:var(--mb-brand)] font-bold uppercase">
                    Assigned
                  </span>
                </div>
                <div className="mt-2 text-lg font-bold text-[color:var(--mb-ink)]">{assignedCounselorName}</div>
                <div className="mt-0.5 text-sm text-[color:var(--mb-muted)]">100% confidential student channel</div>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                className="mb-btn mb-btn-line mt-3 self-start whitespace-nowrap !min-h-[44px] !px-4 text-sm"
              >
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                Message counselor
              </button>
            </div>
          </div>

          {/* CHECK-IN: one question per screen, shown as stops on a route (Calm Wayfinding) */}
          <section
            className="rounded-md border-2 border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-5 sm:p-6"
            aria-labelledby="checkin-h"
          >
            <div className="mb-5">
              <h2 id="checkin-h" className="mb-sign text-3xl font-bold">
                Check-in
              </h2>
              <p className="text-[color:var(--mb-muted)]">
                Seven questions about the last two weeks. About a minute. Your answers are visible to you and approved
                guidance staff only.
              </p>
              <p className="mt-1 max-w-[65ch] text-sm text-[color:var(--mb-muted)]">
                By taking part, you consent to your answers being collected and processed for triage and support.
              </p>
            </div>

            {surveyCompleted ? (
              (() => {
                const high = lastSubmission?.riskLevel === "high" || lastSubmission?.flaggedForImmediateReview;
                const medium = !high && lastSubmission?.riskLevel === "medium";
                const Icon = high ? HeartPulse : medium ? Sprout : Sparkles;
                return (
                  <div className="space-y-4 animate-fade-up" aria-live="polite">
                    <div className="mb-plate p-5 sm:p-6">
                      <div className="flex items-start gap-4">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded bg-[color:var(--mb-panel-ink)] text-[color:var(--mb-panel)]">
                          <Icon className="h-6 w-6" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="mb-sign text-lg font-bold opacity-90">
                            {high
                              ? "Priority support suggested"
                              : medium
                                ? "Some stress is showing"
                                : "Steady right now"}
                          </p>
                          <h3 className="mb-sign text-3xl font-bold leading-tight sm:text-4xl">
                            {high
                              ? "You don't have to carry this alone."
                              : medium
                                ? "Thank you for checking in. Take some time to breathe."
                                : "Check-in complete. You're doing well."}
                          </h3>
                          <p className="mt-2 max-w-[60ch] text-[color:var(--mb-panel-soft)]">
                            {high
                              ? "Your answers suggest you may be going through heavy stress or distress. Your check-in is marked for priority review by guidance staff, in confidence."
                              : medium
                                ? "Your answers suggest elevated stress. Self-care routines, or talking with a campus counselor, can help with academic pressure."
                                : "Your answers show a steady baseline. Keep up your routines, and remember support is here if things change."}
                          </p>
                        </div>
                      </div>
                    </div>

                    {high && (
                      <div className="mb-plate-amber p-5">
                        <p className="mb-sign text-2xl font-bold">If you need to talk to someone right now</p>
                        <ul className="mt-2 space-y-1">
                          <li>
                            <strong>NCMH National Crisis Hotline:</strong> call{" "}
                            <a href="tel:1553" className="font-bold underline">
                              1553
                            </a>{" "}
                            (toll-free) or{" "}
                            <a href="tel:+639178998727" className="font-bold underline">
                              0917-899-8727
                            </a>
                          </li>
                          <li>
                            <strong>Hopeline Philippines:</strong>{" "}
                            <a href="tel:+639175584673" className="font-bold underline">
                              0917-558-4673
                            </a>{" "}
                            or{" "}
                            <a href="tel:+63288044673" className="font-bold underline">
                              (02) 8804-4673
                            </a>
                          </li>
                          <li>
                            <strong>USA Guidance Center:</strong> message through Mind Bridge or visit the Guidance
                            Office.
                          </li>
                        </ul>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={openBookingModal} className="mb-btn mb-btn-solid">
                        <Calendar className="h-5 w-5" aria-hidden="true" /> Book a counselor session
                      </button>
                      <button type="button" onClick={resetCheckIn} className="mb-btn mb-btn-line">
                        Take the check-in again
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <>
                {(() => {
                  const firstOpen = answers.findIndex((a) => a === null);
                  const reach = firstOpen === -1 ? SCREENING_QUESTIONS.length - 1 : firstOpen;
                  return (
                    <ol className="mb-5 flex gap-2" aria-label="Check-in progress">
                      {SCREENING_QUESTIONS.map((q, i) => {
                        const done = answers[i] !== null;
                        const here = i === qIndex;
                        return (
                          <li key={q.id} className="flex-1">
                            <button
                              type="button"
                              onClick={() => setQIndex(i)}
                              disabled={i > reach}
                              aria-current={here ? "step" : undefined}
                              aria-label={`Question ${i + 1}${done ? ", answered" : ""}`}
                              className={`mb-sign grid h-11 w-full place-items-center rounded border-2 text-xl font-bold disabled:cursor-not-allowed disabled:opacity-50 ${
                                here
                                  ? "border-[color:var(--mb-panel)] bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)]"
                                  : done
                                    ? "border-[color:var(--mb-brand)] bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-brand)]"
                                    : "border-[color:var(--mb-line)] text-[color:var(--mb-muted)]"
                              }`}
                            >
                              {done && !here ? <Check className="h-5 w-5" aria-hidden="true" /> : i + 1}
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  );
                })()}

                <div className="mb-plate p-5 sm:p-6">
                  <p className="mb-sign text-lg font-bold opacity-90">
                    You are on question {qIndex + 1} of {SCREENING_QUESTIONS.length}
                  </p>
                  <p className="mb-sign mt-1 text-3xl font-bold leading-tight sm:text-4xl">{currentQ.text}</p>
                  <p className="mt-2 text-[color:var(--mb-panel-soft)]">{currentQ.subtext}</p>
                  {currentQ.isCrisisItem && (
                    <p className="mt-4 rounded bg-[color:var(--mb-panel-ink)] p-3 text-[color:var(--mb-panel)]">
                      This question is about your safety. If you answer anything above 0, your check-in is marked for
                      priority review by guidance staff. If you need to talk to someone right now, call{" "}
                      <a href="tel:1553" className="font-bold underline">
                        1553
                      </a>{" "}
                      (free, 24/7).
                    </p>
                  )}
                </div>

                <fieldset className="mt-5">
                  <legend className="sr-only">{currentQ.text}</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {SCALE_OPTIONS.map((opt) => {
                      const selected = answers[qIndex] === opt.value;
                      return (
                        <label key={opt.value} className="block cursor-pointer">
                          <input
                            type="radio"
                            name={`q-${qIndex}`}
                            value={opt.value}
                            checked={selected}
                            onChange={() => selectOption(opt.value)}
                            className="peer sr-only"
                          />
                          <span
                            className={`flex items-center gap-4 rounded-md border-2 p-4 transition-colors peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-[color:var(--mb-focus)] ${
                              selected
                                ? "border-[color:var(--mb-panel)] bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)]"
                                : "border-[color:var(--mb-line)] hover:border-[color:var(--mb-ink)]"
                            }`}
                          >
                            <span
                              className={`mb-sign grid h-12 w-12 shrink-0 place-items-center rounded text-3xl font-bold ${
                                selected
                                  ? "bg-[color:var(--mb-panel-ink)] text-[color:var(--mb-panel)]"
                                  : "bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)]"
                              }`}
                              aria-hidden="true"
                            >
                              {opt.value}
                            </span>
                            <span>
                              <span className="mb-sign block text-xl font-bold">{opt.label.replace(/^\d - /, "")}</span>
                              <span
                                className={`block ${selected ? "text-[color:var(--mb-panel-soft)]" : "text-[color:var(--mb-muted)]"}`}
                              >
                                {opt.desc}
                              </span>
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {submitError && (
                  <p role="alert" className="mb-alert mt-5 font-medium">
                    {submitError}
                  </p>
                )}

                <div className="mt-6 flex items-center justify-between gap-3 border-t-2 border-[color:var(--mb-line)] pt-5">
                  <button
                    type="button"
                    onClick={() => setQIndex(Math.max(0, qIndex - 1))}
                    disabled={qIndex === 0}
                    className="mb-btn mb-btn-line"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={answers[qIndex] === null || submittingSurvey}
                    className="mb-btn mb-btn-solid"
                  >
                    {submittingSurvey ? (
                      <>
                        <Spinner size={16} className="text-[color:var(--mb-panel-ink)]" />
                        <span>Evaluating…</span>
                      </>
                    ) : qIndex === SCREENING_QUESTIONS.length - 1 ? (
                      "Submit check-in"
                    ) : (
                      <>
                        Next <ArrowRight className="h-5 w-5" aria-hidden="true" />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </section>

          {/* WELLNESS TREND LINE CHART & HISTORY SECTION */}
          <div className="rounded-md border-2 border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 border-b-2 border-[color:var(--mb-line)] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-[color:var(--mb-brand)] bg-[color:var(--mb-brand-bg)]">
                    <TrendingUp className="h-5 w-5 text-[color:var(--mb-brand)]" aria-hidden="true" />
                  </span>
                  <h2 className="text-2xl font-bold text-[color:var(--mb-ink)]">My wellness trend</h2>
                </div>
                <p className="mt-1 text-[color:var(--mb-muted)]">Your check-in scores over time.</p>
              </div>

              {pastAssessments.length > 0 && (
                <div
                  role="group"
                  aria-label="Trend view"
                  className="flex items-center gap-1 self-start rounded-md border-2 border-[color:var(--mb-line)] bg-[color:var(--mb-ground)] p-1"
                >
                  <button
                    type="button"
                    onClick={() => setTrendView("chart")}
                    aria-pressed={trendView === "chart"}
                    className={`min-h-[44px] px-4 font-bold rounded-md transition ${
                      trendView === "chart"
                        ? "bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)]"
                        : "text-[color:var(--mb-muted)] hover:text-[color:var(--mb-ink)]"
                    }`}
                  >
                    Chart
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendView("table")}
                    aria-pressed={trendView === "table"}
                    className={`min-h-[44px] px-4 font-bold rounded-md transition ${
                      trendView === "table"
                        ? "bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)]"
                        : "text-[color:var(--mb-muted)] hover:text-[color:var(--mb-ink)]"
                    }`}
                  >
                    History
                  </button>
                </div>
              )}
            </div>

            {loadingHistory ? (
              <div role="status" className="flex h-56 items-center justify-center gap-2 text-[color:var(--mb-muted)]">
                <Spinner size={18} /> Loading your trend…
              </div>
            ) : chartData.length === 0 ? (
              <div className="rounded-md border-2 border-dashed border-[color:var(--mb-line)] p-8 text-center text-[color:var(--mb-muted)]">
                <BarChart2 className="mx-auto mb-2 h-6 w-6" aria-hidden="true" />
                <p className="text-lg font-bold text-[color:var(--mb-ink)]">No check-ins yet</p>
                <p className="mx-auto mt-1 max-w-sm">
                  Complete your first one-minute check-in above and your scores will show up here over time.
                </p>
              </div>
            ) : trendView === "chart" ? (
              <div>
                {/* Score Benchmark Legend */}
                <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[color:var(--mb-muted)]">
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[color:var(--mb-safe-solid)]" />
                    <span>0 to 6: balanced</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[color:var(--mb-amber)]" />
                    <span>7 to 12: moderate</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[color:var(--mb-urgent-solid)]" />
                    <span>13 to 21: priority</span>
                  </span>
                </div>

                {/* Area Line Chart */}
                <div
                  className="h-60 sm:h-64 w-full"
                  role="img"
                  aria-label={`Line chart of ${chartData.length} check-in scores, latest ${chartData[chartData.length - 1].score} out of ${chartData[chartData.length - 1].max}. Switch to History for a text list.`}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={[0, 21]}
                        stroke="var(--mb-muted)"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="rounded-md border-2 border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-3 text-sm">
                                <div className="font-bold text-[color:var(--mb-ink)]">
                                  {data.fullDate || data.formattedDate}
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                  <span className="text-[color:var(--mb-brand)] font-bold">
                                    Score: {data.score} / {data.max}
                                  </span>
                                  <span
                                    className={`rounded-md px-2 py-0.5 text-xs font-bold uppercase ${
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
                      <ReferenceLine y={6} stroke="var(--mb-safe)" strokeDasharray="3 3" opacity={0.6} />
                      <ReferenceLine y={12} stroke="var(--mb-warn)" strokeDasharray="3 3" opacity={0.6} />
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
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border-2 border-[color:var(--mb-line)] bg-[color:var(--mb-ground)] p-3"
                  >
                    <div>
                      <span className="font-bold text-[color:var(--mb-ink)]">{formatDateTime(item.createdAt)}</span>
                      <span className="ml-2 text-[color:var(--mb-muted)]">
                        Score: <strong className="text-[color:var(--mb-brand)]">{item.total}</strong> /{" "}
                        {item.maxScore || 21}
                      </span>
                    </div>
                    <span
                      className={`rounded-md px-2.5 py-0.5 text-xs font-bold uppercase ${
                        item.riskLevel === "high"
                          ? "bg-[color:var(--mb-urgent-bg)] text-[color:var(--mb-urgent)] border-2 border-[color:var(--mb-urgent)]"
                          : item.riskLevel === "medium"
                            ? "bg-[color:var(--mb-warn-bg)] text-[color:var(--mb-warn)] border-2 border-[color:var(--mb-warn)]"
                            : "bg-[color:var(--mb-safe-bg)] text-[color:var(--mb-safe)] border-2 border-[color:var(--mb-safe)]"
                      }`}
                    >
                      {item.riskLevel} risk
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ASIDE: UPCOMING APPOINTMENTS & GOALS */}
        <aside className="lg:w-1/3 space-y-6 w-full">
          <div className="rounded-md border-2 border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2 border-b-2 border-[color:var(--mb-line)] pb-3">
              <h2 className="flex items-center gap-2 text-2xl font-bold text-[color:var(--mb-ink)]">
                <Calendar className="h-5 w-5 text-[color:var(--mb-brand)]" aria-hidden="true" />
                <span>Sessions</span>
              </h2>
              <Link
                to="/appointments"
                className="inline-flex min-h-[44px] items-center font-bold text-[color:var(--mb-brand)] underline"
              >
                View all
              </Link>
            </div>

            <div className="space-y-2.5">
              {loadingAppointments ? (
                <div role="status" className="flex items-center gap-2 py-4 text-[color:var(--mb-muted)]">
                  <Spinner size={18} /> Loading sessions…
                </div>
              ) : appointments.length === 0 ? (
                <div className="rounded-md border-2 border-dashed border-[color:var(--mb-line)] p-4 text-center text-[color:var(--mb-muted)]">
                  No sessions scheduled.
                </div>
              ) : (
                appointments.slice(0, 3).map((apt) => (
                  <div
                    key={apt.id}
                    className="rounded-md border-2 border-[color:var(--mb-line)] bg-[color:var(--mb-ground)] p-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="font-bold text-[color:var(--mb-ink)]">{apt.title || "Counseling Session"}</div>
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold uppercase ${
                          (apt.status || "").toLowerCase().includes("confirm")
                            ? "bg-[color:var(--mb-safe-bg)] text-[color:var(--mb-safe)] border-2 border-[color:var(--mb-safe)]"
                            : (apt.status || "").toLowerCase().includes("pending")
                              ? "bg-[color:var(--mb-warn-bg)] text-[color:var(--mb-warn)] border-2 border-[color:var(--mb-warn)]"
                              : "bg-[color:var(--mb-surface-2)] text-[color:var(--mb-muted)] border-2 border-[color:var(--mb-line)]"
                        }`}
                      >
                        {apt.status || "Pending"}
                      </span>
                    </div>
                    <div className="mt-1 text-[color:var(--mb-muted)]">
                      {formatDateTime(apt.start || apt.date, "") || "Scheduled"}
                    </div>
                    {apt.counselorName && (
                      <div className="mt-0.5 text-[color:var(--mb-brand)] font-bold">With {apt.counselorName}</div>
                    )}
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={openBookingModal}
              disabled={loadingSlots}
              className="mb-btn mb-btn-solid mt-4 w-full"
            >
              {loadingSlots ? <Spinner size={16} /> : <Calendar className="h-5 w-5" aria-hidden="true" />}
              Book a session
            </button>
          </div>

          {/* My Wellness Focus Goals */}
          <div className="rounded-md border-2 border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2 border-b-2 border-[color:var(--mb-line)] pb-3">
              <h2 className="flex items-center gap-2 text-2xl font-bold text-[color:var(--mb-ink)]">
                <Target className="h-5 w-5 text-[color:var(--mb-brand)]" aria-hidden="true" />
                <span>My goals</span>
              </h2>
              <Link
                to="/settings"
                className="inline-flex min-h-[44px] items-center font-bold text-[color:var(--mb-brand)] underline"
              >
                Edit
              </Link>
            </div>

            {Array.isArray(userData?.wellnessGoals) && userData.wellnessGoals.length > 0 ? (
              <ul className="space-y-2">
                {userData.wellnessGoals.map((goal) => (
                  <li
                    key={goal}
                    className="flex items-center gap-2 rounded-md border-2 border-[color:var(--mb-line)] bg-[color:var(--mb-ground)] p-3 text-[color:var(--mb-ink)]"
                  >
                    <Check className="h-4 w-4 shrink-0 text-[color:var(--mb-brand)]" aria-hidden="true" />
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-md border-2 border-dashed border-[color:var(--mb-line)] p-4 text-center text-[color:var(--mb-muted)]">
                No goals chosen yet.{" "}
                <Link to="/settings" className="font-bold text-[color:var(--mb-brand)] underline">
                  Pick your goals
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* BOOKING: counselor, time, confirm */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Book a counselor"
        description="A confidential one-to-one session with university guidance counselors."
        maxWidth="max-w-xl"
      >
        {bookingError && (
          <p role="alert" className="mb-alert font-medium">
            {bookingError}
          </p>
        )}
        <BookingFlow
          slots={availableSlots}
          loading={loadingSlots}
          bookingId={bookingId}
          onBook={handleBookSlot}
          onCancel={() => setShowModal(false)}
        />
      </Modal>

      {/* CONFIDENTIAL CHAT MODAL (STUDENT TO ASSIGNED COUNSELOR) */}
      {chatOpen && (
        <Suspense fallback={null}>
          <ConfidentialChatModal
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
            studentId={currentUser?.uid}
            recipientName={assignedCounselorName}
            recipientRole="counselor"
          />
        </Suspense>
      )}
    </div>
  );
}

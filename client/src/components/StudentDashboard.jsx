import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAppointments, bookAppointment, submitResponse, getAvailability, getMyAssessments } from "../api";
import { useAuth } from "../AuthContext.jsx";

function Spinner({ className = "h-4 w-4" }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" />
      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-90" />
    </svg>
  );
}

// Safely formats dates to prevent the "Invalid Date" error
function safeFormatDate(val) {
  if (!val) return null;
  if (typeof val === "string" && !val.includes("-") && !val.includes("/")) return val;
  const date = new Date(val);
  return Number.isNaN(date.getTime()) ? val : date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
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
      setAvailableSlots(slots.filter(s => !s.isBooked));
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
  const latestRisk = lastSubmission?.riskLevel || pastAssessments[0]?.riskLevel || "low";

  return (
    <div className="flex flex-col gap-6 lg:flex-row animate-fade-up relative">
      <section className="lg:w-2/3 flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {displayName}</h1>
          <p className="mt-1 text-cyan-200">What&apos;s on your mind today?</p>
        </div>

        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Latest Status</div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-block h-3 w-3 rounded-full ${
                  latestRisk === "high"
                    ? "bg-red-500 animate-pulse"
                    : latestRisk === "medium"
                    ? "bg-amber-400"
                    : "bg-emerald-400"
                }`}
              />
              <span className="text-lg font-semibold text-white capitalize">
                {latestRisk === "high" ? "Needs Attention" : latestRisk === "medium" ? "Elevated Stress" : "Balanced"}
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Next session</div>
            <div className="mt-2 text-base font-semibold text-white truncate">
              {appointments.length > 0 ? safeFormatDate(appointments[0].start || appointments[0].date) : "None scheduled"}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Counselor note</div>
            <div className="mt-2 text-xs text-gray-300 line-clamp-2">
              {appointments[0]?.counselorName
                ? `Assigned counselor: ${appointments[0].counselorName}`
                : "Remember: Guidance counseling is confidential and always available."}
            </div>
          </div>
        </div>

        {/* WELLNESS SURVEY */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌿</span>
              <div>
                <h2 className="text-xl font-semibold text-white">Wellness Check-in</h2>
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
            <div className="space-y-6">
              {/* Empathetic Result Card */}
              <div
                className={`rounded-2xl border p-6 text-center ${
                  lastSubmission?.riskLevel === "high" || lastSubmission?.flaggedForImmediateReview
                    ? "border-red-500/30 bg-red-500/10"
                    : lastSubmission?.riskLevel === "medium"
                    ? "border-amber-500/30 bg-amber-500/10"
                    : "border-emerald-500/30 bg-emerald-500/10"
                }`}
              >
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-900/80 text-2xl shadow-inner">
                  {lastSubmission?.riskLevel === "high" ? "❤️‍🩹" : lastSubmission?.riskLevel === "medium" ? "🌱" : "✨"}
                </div>
                <h3 className="text-xl font-bold text-white">
                  {lastSubmission?.riskLevel === "high" || lastSubmission?.flaggedForImmediateReview
                    ? "We're here with you — You don't have to carry this alone."
                    : lastSubmission?.riskLevel === "medium"
                    ? "Thank you for checking in — Take some time to breathe."
                    : "Check-in Complete — You're doing great!"}
                </h3>
                <p className="mt-2 text-sm text-gray-300 max-w-lg mx-auto leading-relaxed">
                  {lastSubmission?.riskLevel === "high" || lastSubmission?.flaggedForImmediateReview
                    ? "Your responses suggest you may be navigating heavy stress or emotional distress. A University Counselor has been prioritized to review your status in complete confidence."
                    : lastSubmission?.riskLevel === "medium"
                    ? "Your answers indicate elevated stress levels. Practicing self-care routines or speaking with a campus counselor can help navigate academic pressures."
                    : "Your answers show a stable wellness baseline. Continue your healthy routines, and remember support is always here if things change."}
                </p>

                {/* Crisis Support Hotlines Banner (Philippines & Campus) */}
                {(lastSubmission?.riskLevel === "high" || lastSubmission?.flaggedForImmediateReview) && (
                  <div className="mt-5 rounded-xl border border-red-500/30 bg-gray-950/80 p-4 text-left">
                    <div className="flex items-center gap-2 text-red-400 font-semibold text-sm mb-2">
                      <span>🆘</span>
                      <span>Immediate Crisis Support Resources (Free & 24/7)</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-gray-300">
                      <li>• <strong>NCMH National Crisis Hotline:</strong> Dial <span className="text-cyan-300 font-mono">1553</span> (Toll-Free) or <span className="text-cyan-300 font-mono">0917-899-8727</span></li>
                      <li>• <strong>Hopeline Philippines:</strong> <span className="text-cyan-300 font-mono">0917-558-4673</span> / <span className="text-cyan-300 font-mono">(02) 8804-4673</span></li>
                      <li>• <strong>USA Center for Guidance & Counseling:</strong> Inquire directly through Mind Bridge or visit the Guidance Office.</li>
                    </ul>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={openBookingModal}
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500 shadow-md"
                  >
                    <span>📅</span>
                    <span>Book Counselor Session</span>
                  </button>
                  <button
                    onClick={resetCheckIn}
                    className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-700 transition"
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
                <div className="text-xs uppercase tracking-wider text-cyan-400 font-semibold mb-1">
                  Question {qIndex + 1} of {SCREENING_QUESTIONS.length} {currentQ.isCrisisItem && "• Safety Item"}
                </div>
                <p className="text-lg font-medium text-gray-100">{currentQ.text}</p>
                <p className="text-xs text-gray-400 mt-0.5">{currentQ.subtext}</p>
              </div>

              {/* Options */}
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SCALE_OPTIONS.map((opt) => {
                  const isSelected = answers[qIndex] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => selectOption(opt.value)}
                      className={`rounded-xl p-4 text-left transition transform focus:outline-none ${
                        isSelected
                          ? "bg-cyan-600 border-cyan-400 text-white shadow-md scale-[1.01]"
                          : "border border-gray-800 bg-gray-800/80 text-gray-300 hover:border-gray-700 hover:bg-gray-700/80"
                      }`}
                    >
                      <div className="font-semibold text-sm">{opt.label}</div>
                      <div className={`text-xs mt-1 ${isSelected ? "text-cyan-100" : "text-gray-400"}`}>
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                <button
                  onClick={() => setQIndex(Math.max(0, qIndex - 1))}
                  disabled={qIndex === 0}
                  className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-30 transition"
                >
                  Previous
                </button>
                <button 
                  onClick={handleNext} 
                  disabled={answers[qIndex] === null || submittingSurvey} 
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50 shadow-md"
                >
                  {submittingSurvey ? (
                    <>
                      <Spinner className="text-white" />
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

        {/* Check-in History Log */}
        {pastAssessments.length > 0 && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
              <span>📈</span>
              <span>Past Wellness Check-ins</span>
            </h3>
            <div className="space-y-2">
              {pastAssessments.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-800/40 p-3 text-xs"
                >
                  <div>
                    <span className="font-medium text-white">{safeFormatDate(item.createdAt)}</span>
                    <span className="ml-2 text-gray-400">Score: {item.total}/{item.maxScore || 21}</span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-semibold capitalize ${
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
          </div>
        )}
      </section>

      <aside className="lg:w-1/3">
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">My Counseling Sessions</h3>
          <div className="space-y-3">
            {loadingAppointments ? (
              <div className="flex items-center gap-2 text-gray-400"><Spinner /> Loading...</div>
            ) : appointments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-700 p-4 text-center text-sm text-gray-500">
                No upcoming appointments.
              </div>
            ) : (
              appointments.map((apt) => (
                <div key={apt.id} className="rounded-xl border border-gray-800 bg-gray-800/50 p-3">
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-white">{apt.title || "Counseling Session"}</div>
                    <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-wide text-cyan-400">{apt.status || "Pending"}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    {safeFormatDate(apt.start || apt.date) || "Scheduled"}
                  </div>
                </div>
              ))
            )}
          </div>
          <button
            onClick={openBookingModal}
            className="mt-5 w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 shadow-sm"
          >
            Book appointment
          </button>
        </div>

        {/* My Wellness Focus Goals */}
        <div className="mt-5 rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-white flex items-center gap-1.5">
              <span>🎯</span>
              <span>My Wellness Goals</span>
            </h3>
            <Link
              to="/settings"
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Edit
            </Link>
          </div>

          {Array.isArray(userData?.wellnessGoals) && userData.wellnessGoals.length > 0 ? (
            <div className="space-y-2">
              {userData.wellnessGoals.map((goal, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-800/40 p-2.5 text-xs text-gray-200"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold">
                    ✓
                  </span>
                  <span className="truncate">{goal}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-800 p-3.5 text-center text-xs text-gray-500">
              No goals set yet.{" "}
              <Link to="/settings" className="text-cyan-400 hover:underline">
                Set goals in Settings
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* BOOKING MODAL FOR LIVE COUNSELOR SLOTS */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-xl animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Select Available Counselor Slot</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-lg">✕</button>
            </div>

            {loadingSlots ? (
              <div className="py-8 text-center text-gray-400 flex items-center justify-center gap-2"><Spinner /> Loading available slots...</div>
            ) : availableSlots.length === 0 ? (
              <div className="py-8 text-center text-gray-500 border border-dashed border-gray-800 rounded-xl">
                No open counselor time slots found at the moment. Please check back later.
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {availableSlots.map((slot) => {
                  const startTime = safeFormatDate(slot.start || slot.date || slot.time);
                  const endTime = safeFormatDate(slot.end || slot.to);

                  return (
                    <div key={slot.id} className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-800/40 p-4">
                      <div>
                        <div className="text-sm font-medium text-white">Counselor: {slot.counselorName || "Assigned Counselor"}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {startTime || "Unknown Time"} {endTime ? `to ${endTime}` : ""}
                        </div>
                      </div>
                      <button
                        onClick={() => handleBookSlot(slot)}
                        disabled={bookingId === slot.id}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
                      >
                        {bookingId === slot.id ? <Spinner /> : "Book Slot"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
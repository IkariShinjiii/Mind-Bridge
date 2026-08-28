import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAppointments, bookAppointment, submitResponse, getAvailability } from "../api";
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
  return Number.isNaN(date.getTime()) ? val : date.toLocaleString();
}

export default function StudentDashboard() {
  const { currentUser, userData } = useAuth(); 
  const userName = userData?.name || currentUser?.displayName || "Student";
  const displayName = userName.split(" ")[0] || "Student";

  const QUESTIONS = [
    { id: "q1", text: "Over the past week, how often have you felt overwhelmed by your responsibilities?" },
    { id: "q2", text: "How often in the past week have you had difficulty sleeping?" },
    { id: "q3", text: "How connected have you felt to friends or family?" },
    { id: "q4", text: "How often have you felt anxious or on edge?" },
    { id: "q5", text: "How much have you been able to focus on daily tasks?" },
  ];

  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState(Array(QUESTIONS.length).fill(null));
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [submittingSurvey, setSubmittingSurvey] = useState(false);
  
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  
  // Modal & Slot Booking States
  const [showModal, setShowModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingId, setBookingId] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadingAppointments(true);
      try {
        const data = await getAppointments();
        if (!mounted) return;
        setAppointments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load appointments", err);
      } finally {
        if (mounted) setLoadingAppointments(false);
      }
    }
    load();
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
    if (qIndex < QUESTIONS.length - 1) {
      setQIndex(qIndex + 1);
    } else {
      setSubmittingSurvey(true);
      try {
        await submitResponse(answers);
        setSurveyCompleted(true);
      } catch (error) {
        console.error("Failed to submit survey", error);
      } finally {
        setSubmittingSurvey(false);
      }
    }
  }

  const answeredCount = answers.filter((a) => a !== null).length;
  const progressPct = Math.round((answeredCount / QUESTIONS.length) * 100);

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
            <div className="text-xs text-gray-400 uppercase tracking-wider">Mood check</div>
            <div className="mt-2 text-xl font-semibold text-white">Balanced</div>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Next session</div>
            <div className="mt-2 text-xl font-semibold text-white">
              {appointments.length > 0 ? safeFormatDate(appointments[0].start || appointments[0].date) : "None"}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Counselor note</div>
            <div className="mt-2 text-sm text-gray-300">Keep practicing those breathing exercises!</div>
          </div>
        </div>

        {/* WELLNESS SURVEY */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Wellness Check-in</h2>
            {!surveyCompleted && <div className="text-sm text-gray-500">{answeredCount}/{QUESTIONS.length}</div>}
          </div>

          {surveyCompleted ? (
            <div className="py-8 text-center border border-dashed border-gray-700 rounded-xl bg-gray-800/50">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400">✓</div>
              <h3 className="text-lg font-medium text-white">Check-in Complete</h3>
              <p className="mt-1 text-sm text-gray-400">Your counselor has been updated. Thanks for checking in!</p>
            </div>
          ) : (
            <>
              <div className="mb-4 w-full h-2 overflow-hidden rounded-full bg-gray-800">
                <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="mb-5"><p className="text-lg font-medium text-gray-200">{QUESTIONS[qIndex].text}</p></div>
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((value) => {
                  const isSelected = answers[qIndex] === value;
                  const labels = ["0 - Never", "1 - Sometimes", "2 - Often", "3 - Always"];
                  return (
                    <button
                      key={value}
                      onClick={() => selectOption(value)}
                      className={`rounded-xl px-4 py-3 text-left transition transform focus:outline-none ${
                        isSelected ? "bg-cyan-600 border-cyan-500 text-white" : "border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      <div className="text-sm font-medium">{labels[value]}</div>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between">
                <button onClick={() => setQIndex(Math.max(0, qIndex - 1))} disabled={qIndex === 0} className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 disabled:opacity-30">
                  Previous
                </button>
                <button 
                  onClick={handleNext} 
                  disabled={answers[qIndex] === null || submittingSurvey} 
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50"
                >
                  {submittingSurvey ? <Spinner color="#fff" /> : (qIndex === QUESTIONS.length - 1 ? "Submit" : "Next")}
                </button>
              </div>
            </>
          )}
        </div>
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
                  // Use our helper to grab the right properties without throwing invalid dates
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
import React, { useEffect, useState } from "react";
import { getAppointments, bookAppointment } from "../api";
import { useAuth } from "../AuthContext.jsx";

function Spinner({ className = "h-4 w-4" }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" />
      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-90" />
    </svg>
  );
}

export default function StudentDashboard() {
  // Fixed the mismatch: we now pull currentUser and userData properly
  const { currentUser, userData } = useAuth(); 
  
  // Checks Firestore first, then Google, then falls back
  const userName = userData?.name || currentUser?.displayName || "Student";
  const displayName = userName.split(" ")[0] || "Student"; // Gets just the first name for the welcome text

  const QUESTIONS = [
    { id: "q1", text: "Over the past week, how often have you felt overwhelmed by your responsibilities?" },
    { id: "q2", text: "How often in the past week have you had difficulty sleeping?" },
    { id: "q3", text: "How connected have you felt to friends or family?" },
    { id: "q4", text: "How often have you felt anxious or on edge?" },
    { id: "q5", text: "How much have you been able to focus on daily tasks?" },
  ];

  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState(Array(QUESTIONS.length).fill(null));
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [booking, setBooking] = useState(false);
  const [selected, setSelected] = useState(null);

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

  async function handleBook() {
    setBooking(true);
    try {
      const created = await bookAppointment();
      const fresh = await getAppointments();
      setAppointments(Array.isArray(fresh) ? fresh : []);
      if (created) {
        setSelected(created);
      }
    } catch (err) {
      console.error("Booking failed", err);
      setAppointments((prev) => [
        ...prev,
        { id: `local-${Date.now()}`, title: "Counseling Session (pending)", date: new Date().toISOString(), status: "Pending" },
      ]);
    } finally {
      setBooking(false);
    }
  }

  function selectOption(value) {
    setAnswers((prev) => {
      const copy = [...prev];
      copy[qIndex] = value;
      return copy;
    });
  }

  function prev() {
    setQIndex((i) => Math.max(0, i - 1));
  }

  function next() {
    if (qIndex < QUESTIONS.length - 1) setQIndex((i) => i + 1);
    else console.log("Check-in complete", { answers });
  }

  const answeredCount = answers.filter((a) => a !== null).length;
  const progressPct = Math.round((answeredCount / QUESTIONS.length) * 100);

  return (
    <>
      <div className="flex flex-col gap-6 lg:flex-row">
        <section className="lg:w-2/3">
          <div className="mb-4">
            <h1 className="text-3xl font-bold">Welcome back, {displayName}</h1>
            <p className="mt-1 text-cyan-200">What&apos;s on your mind today?</p>
          </div>

          <div className="card-surface p-6">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Wellness Check-in</h2>
                <div className="text-sm text-white/60">{answeredCount}/{QUESTIONS.length}</div>
              </div>

              <div className="w-40">
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/6">
                  <div className="h-full bg-cyan-500 transition-all" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="mt-1 text-right text-xs text-white/60">{progressPct}%</div>
              </div>
            </div>

            <div className="mb-4">
              <p className="font-medium text-white/90">{QUESTIONS[qIndex].text}</p>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((value) => {
                const isSelected = answers[qIndex] === value;
                const labels = ["0 Never", "1 Sometimes", "2 Often", "3 Always"];
                return (
                  <button
                    key={value}
                    onClick={() => selectOption(value)}
                    className={`rounded-lg px-4 py-3 text-left transition transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                      isSelected ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-black" : "border border-white/6 bg-gray-800 text-white/90"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{labels[value]}</div>
                      <div className="text-xs text-white/50">Score {value}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button onClick={prev} disabled={qIndex === 0} className="rounded-md bg-white/6 px-3 py-2 text-white/80 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-40">
                  Previous
                </button>
                <button onClick={next} className="rounded-md bg-cyan-600 px-3 py-2 font-semibold text-white transition hover:brightness-105">
                  {qIndex === QUESTIONS.length - 1 ? "Finish" : "Next"}
                </button>
              </div>

              <div className="text-sm text-white/60">Progress: {progressPct}%</div>
            </div>
          </div>
        </section>

        <aside className="lg:w-1/3">
          <div className="card-surface mb-4 p-4">
            <h3 className="text-lg font-semibold">My Counseling Sessions</h3>

            <div className="mt-3">
              {loadingAppointments ? (
                <div className="flex items-center gap-2 text-white/60"><Spinner /> <span>Loading appointments...</span></div>
              ) : appointments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 bg-gray-900/60 p-3 text-sm text-white/60">
                  No appointments yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.slice(0, 3).map((appointment) => (
                    <button
                      key={appointment.id || appointment._id}
                      type="button"
                      onClick={() => setSelected(appointment)}
                      className="w-full rounded-xl border border-white/6 bg-gray-900/60 p-3 text-left transition hover:border-cyan-500/50 hover:bg-gray-900"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-white">{appointment.title || "Counseling Session"}</div>
                        <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-wide text-cyan-200">{appointment.status || "Scheduled"}</span>
                      </div>
                      <div className="mt-2 text-xs text-white/60">{appointment.date ? new Date(appointment.date).toLocaleDateString() : "Date pending"}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={booking}
              onClick={handleBook}
              className="mt-4 w-full rounded-lg bg-cyan-600 px-4 py-2.5 font-medium text-white transition hover:brightness-110 disabled:opacity-70"
            >
              {booking ? "Booking..." : "Book appointment"}
            </button>
          </div>

          {selected && (
            <div className="card-surface p-4">
              <h3 className="text-lg font-semibold">Session Details</h3>
              <div className="mt-3 space-y-2 text-sm text-white/75">
                <div><span className="text-white/50">Topic:</span> {selected.title || "Counseling Session"}</div>
                <div><span className="text-white/50">Date:</span> {selected.date ? new Date(selected.date).toLocaleString() : "Pending"}</div>
                <div><span className="text-white/50">Status:</span> {selected.status || "Pending"}</div>
                {selected.counselorNotes ? <div><span className="text-white/50">Notes:</span> {selected.counselorNotes}</div> : null}
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
import React, { useEffect, useState } from "react";
import { getAppointments, bookAppointment } from "../api";

function Spinner({ className = "h-4 w-4" }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" />
      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-90" />
    </svg>
  );
}

export default function StudentDashboard() {
  const [userName] = useState("Jherwin Sarmiento");
  const [displayName] = useState("Jherwin");

  // Check-in local state (kept lightweight)
  const QUESTIONS = [
    { id: "q1", text: "Over the past week, how often have you felt overwhelmed by your responsibilities?" },
    { id: "q2", text: "How often in the past week have you had difficulty sleeping?" },
    { id: "q3", text: "How connected have you felt to friends or family?" },
    { id: "q4", text: "How often have you felt anxious or on edge?" },
    { id: "q5", text: "How much have you been able to focus on daily tasks?" },
  ];

  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState(Array(QUESTIONS.length).fill(null));

  // Appointments
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [booking, setBooking] = useState(false);
  const [detailLoadingId, setDetailLoadingId] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadingAppointments(true);
      try {
        const data = await getAppointments();
        if (!mounted) return;
        // Expecting array of { id, title, date, status, counselorNotes }
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
      // This expects server API to create an appointment; here we call bookAppointment without availabilityId for demo
      const created = await bookAppointment();
      // If server returns created appointment, refresh list
      const fresh = await getAppointments();
      setAppointments(Array.isArray(fresh) ? fresh : []);
    } catch (err) {
      console.error("Booking failed", err);
      // fallback: optimistic UI
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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col font-sans">
      <header className="bg-gray-900 border-b border-white/6">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="font-bold text-lg">Mind Bridge</div>
            <nav className="hidden md:flex items-center gap-3">
              <button className="px-3 py-1 rounded-full bg-cyan-600 text-white text-sm font-semibold hover:brightness-105 action-button">Check-in</button>
              <button className="px-3 py-1 text-cyan-200 text-sm hover:text-white action-button">Book Appointment</button>
              <button className="px-3 py-1 text-cyan-200 text-sm hover:text-white action-button">My Appointments</button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/6 text-white/70">STUDENT</span>
            <div className="text-sm text-white/90 hidden sm:block">{userName}</div>
            <div className="h-9 w-9 rounded-full bg-gray-700" />
            <button className="text-white underline text-sm">Log out</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 w-full flex-1">
        <div className="flex flex-col lg:flex-row gap-6">
          <section className="lg:w-2/3">
            <div className="mb-4">
              <h1 className="text-3xl font-bold">Welcome back, {displayName}</h1>
              <p className="text-cyan-200 mt-1">What's on your mind today?</p>
            </div>

            <div className="card-surface p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-xl font-semibold">Wellness Check-in</h2>
                  <div className="text-sm text-white/60">{answeredCount}/{QUESTIONS.length}</div>
                </div>

                <div className="w-40">
                  <div className="h-2 w-full bg-white/6 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                  <div className="text-right text-xs text-white/60 mt-1">{progressPct}%</div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-white/90 font-medium">{QUESTIONS[qIndex].text}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {[0, 1, 2, 3].map((v) => {
                  const selected = answers[qIndex] === v;
                  const labels = ["0 Never", "1 Sometimes", "2 Often", "3 Always"];
                  return (
                    <button
                      key={v}
                      onClick={() => selectOption(v)}
                      className={`rounded-lg px-4 py-3 text-left transition transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-cyan-500
                        ${selected ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-black" : "bg-gray-800 text-white/90 border border-white/6"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{labels[v]}</div>
                        <div className="text-xs text-white/50">Score {v}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button onClick={prev} disabled={qIndex === 0} className="rounded-md px-3 py-2 bg-white/6 text-white/80 hover:bg-white/8 disabled:opacity-40 action-button">
                    Previous
                  </button>
                  <button onClick={next} className="rounded-md px-3 py-2 bg-cyan-600 text-white font-semibold hover:brightness-105 action-button">
                    Next
                  </button>
                </div>

                <div className="text-sm text-white/60">Progress: {progressPct}%</div>
              </div>
            </div>
          </section>

          <aside className="lg:w-1/3">
            <div className="card-surface p-4 mb-4">
              <h3 className="font-semibold text-lg">My Counseling Sessions</h3>

              <div className="mt-3">
                {loadingAppointments ? (
                  <div className="flex items-center gap-2 text-white/60"><Spinner /> <span>Loading appointments...</span></div>
                ) : appointments.length === 0 ? (
                  <div className="text-sm text-white/60 mb-4">No upcoming appointments.</div>
                ) : (
                  <ul className="space-y-2">
                    {appointments.map((a) => (
                      <li key={a.id} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{a.title}</div>
                          <div className="text-xs text-white/60">{new Date(a.date).toLocaleString()}</div>
                          <div className={`text-xs mt-1 ${a.status === 'Confirmed' ? 'text-green-400' : a.status === 'Completed' ? 'text-white/80' : 'text-yellow-300'}`}>{a.status || 'Pending'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              setDetailLoadingId(a.id);
                              try {
                                // If appointment payload already contains counselorNotes, just set it to selected;
                                // otherwise we assume getAppointments provided it; otherwise simulate delay
                                await new Promise((r) => setTimeout(r, 350));
                                setSelected(a);
                              } catch (e) {
                                console.error(e);
                              } finally {
                                setDetailLoadingId(null);
                              }
                            }}
                            className="text-sm text-cyan-400 underline action-button flex items-center gap-2"
                          >
                            {detailLoadingId === a.id ? <Spinner className="h-4 w-4" /> : null}
                            Details
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-4">
                  <button onClick={handleBook} disabled={booking} className="w-full rounded-md px-3 py-2 bg-cyan-600 text-white font-semibold hover:brightness-105 action-button flex items-center justify-center gap-2">
                    {booking ? <Spinner className="h-4 w-4" /> : null}
                    {booking ? 'Booking...' : 'Book an Appointment'}
                  </button>
                </div>

                <div className="mt-6 border-t border-white/6 pt-4">
                  <div className="text-sm text-white/60 mb-2">Past Sessions</div>
                  {appointments.filter(a => a.status === 'Completed').length === 0 ? (
                    <div className="text-sm text-white/50">No past sessions yet.</div>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {appointments.filter(a => a.status === 'Completed').map((s) => (
                        <li key={s.id} className="text-white/90">{s.title} • {new Date(s.date).toLocaleDateString()}
                          {s.counselorNotes ? (
                            <div className="mt-1 text-xs text-white/70">Notes: {s.counselorNotes}</div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Simple notes/details pane - polished modal could be added */}
            {selected ? (
              <div className="soft-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{selected.title}</div>
                    <div className="text-xs text-white/60">{new Date(selected.date).toLocaleString()}</div>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-sm text-white/60">Close</button>
                </div>

                <div className="mt-3 text-sm text-white/80">
                  <h4 className="font-medium">Counselor Notes</h4>
                  <p className="mt-2 text-white/70">{selected.counselorNotes || 'No notes available for this session.'}</p>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </main>
    </div>
  );
}

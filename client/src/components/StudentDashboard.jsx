import React, { useEffect, useMemo, useState } from "react";

// StudentDashboard.jsx
// Monolithic student wellness dashboard matching requested design language.
// - Dark indigo / purple theme
// - Check-in card with 5 dynamic questions
// - Support cards: Active Goals, Next Appointment (live countdown), Campus Resources, Featured Tip, Counselor Status
// - All state is local and interactive; no backend calls

const QUESTIONS = [
  {
    id: "q1",
    text:
      "Over the past week, how often have you felt overwhelmed by your responsibilities? (Score 0-3)",
  },
  { id: "q2", text: "How often in the past week have you had difficulty sleeping? (Score 0-3)" },
  { id: "q3", text: "How connected have you felt to friends or family? (Score 0-3)" },
  { id: "q4", text: "How often have you felt anxious or on edge? (Score 0-3)" },
  { id: "q5", text: "How much have you been able to focus on daily tasks? (Score 0-3)" },
];

const INITIAL_GOALS = [
  { id: "g1", title: "Exercise", target: 3, completed: 2 },
  { id: "g2", title: "Daily Meditation", target: 7, completed: 5 },
];

const RESOURCES = [
  {
    id: "r1",
    title: "Stress Workshop",
    details: "Aug 30 · 4:00 PM · Wellness Center · RSVP",
  },
  {
    id: "r2",
    title: "Student Support Group",
    details: "Weekly on Wednesdays · 6:00 PM · Room 210",
  },
];

export default function StudentDashboard() {
  const [name] = useState("Jherwin Sarmiento");
  const [displayName] = useState("Jherwin");

  // Check-in state
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState(Array(QUESTIONS.length).fill(null));

  // Goals & resources
  const [goals, setGoals] = useState(INITIAL_GOALS);
  const [resources] = useState(RESOURCES);

  // Next appointment (hardcoded example)
  const nextAppointmentDate = useMemo(() => new Date("2026-08-28T10:00:00"), []);
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, nextAppointmentDate - Date.now()));

  // Countdown effect
  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft(Math.max(0, nextAppointmentDate - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [nextAppointmentDate]);

  function formatCountdown(ms) {
    if (ms <= 0) return "0 days 0 hrs 0 min";
    const totalSec = Math.floor(ms / 1000);
    const days = Math.floor(totalSec / 86400);
    const hrs = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    return `${String(days).padStart(2, "0")} days ${String(hrs).padStart(2, "0")} hrs ${String(mins).padStart(2, "0")} min`;
  }

  // Progress
  const answeredCount = answers.filter((a) => a !== null).length;
  const progressPct = Math.round((answeredCount / QUESTIONS.length) * 100);

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
  }

  function toggleGoal(id) {
    setGoals((g) =>
      g.map((item) => (item.id === id ? { ...item, completed: Math.min(item.target, item.completed + 1) } : item))
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#06021a] via-[#0b1330] to-[#0e1630] text-white">
      {/* Constellation / network background */}
      <div className="absolute inset-0 -z-10 opacity-30 bg-[radial-gradient(ellipse_at_top_left,_#0b1228,_transparent_25%),radial-gradient(ellipse_at_bottom_right,_#001f3a,_transparent_20%)]">
        {/* subtle SVG network */}
        <svg className="w-full h-full" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="lg" x1="0" x2="1">
              <stop offset="0" stopColor="#09102a" />
              <stop offset="1" stopColor="#001f3a" />
            </linearGradient>
          </defs>
          <g stroke="#11243b" strokeOpacity="0.6" strokeWidth="0.6" fill="none">
            {/* sample network lines */}
            <path d="M20 40 L120 80 L200 30 L320 100" />
            <path d="M60 140 L180 120 L260 160 L380 120" />
            <path d="M0 220 L140 200 L300 220 L420 200" />
          </g>
        </svg>
      </div>

      <header className="border-b border-white/6 bg-gradient-to-b from-[#07112a] to-transparent">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-xl font-bold tracking-tight">Mind Bridge</div>
            <nav className="hidden md:flex items-center gap-2">
              <button className="rounded-full bg-cyan-500 text-white px-3 py-1 text-sm font-semibold shadow-sm hover:brightness-105">Check-in</button>
              <button className="text-cyan-100 hover:text-white px-3 py-1 text-sm">Book Appointment</button>
              <button className="text-cyan-100 hover:text-white px-3 py-1 text-sm">My Appointments</button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/6 text-white/70">STUDENT</span>
            <div className="hidden sm:block text-sm text-white/90">{name}</div>
            <img src="/assets/avatar-placeholder.png" alt="avatar" className="h-9 w-9 rounded-full bg-gray-700 object-cover" />
            <button className="text-white ml-2 underline text-sm">Log out</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Left Column: Greeting + Check-in */}
          <div className="lg:w-2/3">
            <div className="mb-4">
              <h1 className="text-3xl font-bold">Good morning, {displayName}.</h1>
              <p className="text-cyan-200 mt-1">What's on your mind today?</p>
            </div>

            <div className="rounded-2xl bg-[#071428] border border-white/6 p-6 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Wellness Check-in</h2>
                  <div className="text-sm text-white/60">{answeredCount}/{QUESTIONS.length}</div>
                </div>

                <div className="w-48">
                  <div className="h-2 w-full bg-white/6 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400 transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                  <div className="text-right text-xs text-white/60 mt-1">{progressPct}%</div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-white/90 font-medium">{QUESTIONS[qIndex].text}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {[0, 1, 2, 3].map((v) => {
                  const selected = answers[qIndex] === v;
                  const labels = ["0 Never", "1 Sometimes", "2 Often", "3 Always"];
                  return (
                    <button
                      key={v}
                      onClick={() => selectOption(v)}
                      className={`rounded-lg px-4 py-3 text-left transition transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-cyan-400 
                        ${selected ? "bg-gradient-to-r from-[#06b6d4] to-[#06a6ff] text-black border-transparent shadow" : "bg-[#031324] border border-white/6 text-white/90"}`.trim()}
                      aria-pressed={selected}
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
                  <button onClick={prev} disabled={qIndex === 0} className="rounded-md px-3 py-2 bg-white/6 text-white/80 hover:bg-white/8 disabled:opacity-40">
                    Previous
                  </button>
                  <button onClick={next} className="rounded-md px-3 py-2 bg-cyan-500 text-black font-semibold hover:brightness-105">
                    Next
                  </button>
                </div>

                <div className="text-sm text-white/60">Progress: {progressPct}%</div>
              </div>
            </div>
          </div>

          {/* Right Column: Support Cards Grid */}
          <div className="lg:w-1/3 flex flex-col gap-4">
            <div className="rounded-2xl bg-[#071428] border border-white/6 p-4 shadow-sm">
              <h3 className="font-semibold text-lg">Active Goals</h3>
              <ul className="mt-3 space-y-2">
                {goals.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <input id={g.id} type="checkbox" checked={g.completed >= g.target} onChange={() => toggleGoal(g.id)} className="h-4 w-4 rounded" />
                      <div>
                        <div className="text-sm font-medium">{g.title}</div>
                        <div className="text-xs text-white/60">{g.completed}/{g.target} completed</div>
                      </div>
                    </div>
                    <div className="text-xs text-white/60">{g.target}x</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-[#071428] border border-white/6 p-4 shadow-sm">
              <h3 className="font-semibold text-lg">Next Appointment</h3>
              <div className="mt-2">
                <div className="text-sm text-white/90">Session with Dr. Cruz</div>
                <div className="text-xs text-white/60">Aug 28th, 10:00 AM</div>
                <div className="mt-3 text-xs text-cyan-200">{formatCountdown(timeLeft)}</div>
                <div className="mt-4 flex justify-end">
                  <button className="rounded-md px-3 py-2 bg-cyan-500 text-black font-semibold">View Details</button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-[#071428] border border-white/6 p-4 shadow-sm">
              <h3 className="font-semibold text-lg">Campus Resources Feed</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {resources.map((r) => (
                  <li key={r.id} className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-cyan-300 font-bold">R</div>
                    <div>
                      <div className="font-medium">{r.title}</div>
                      <div className="text-xs text-white/60">{r.details}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-[#071428] border border-white/6 p-4 shadow-sm">
              <h3 className="font-semibold text-lg">Featured Tip of the Day</h3>
              <div className="mt-3 flex gap-3 items-start">
                <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-purple-700 to-cyan-400 flex items-center justify-center">
                  {/* simple decorative tree svg */}
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="#0f1724" />
                    <path d="M12 6c1.5 0 2.5 1 3 2.5C16.5 9 15.5 10 14 10H10c-1.5 0-2.5-1-3-1.5C7 7 8.5 6 12 6z" fill="#c7f9ff" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium">5-Minute Grounding Technique</div>
                  <div className="text-xs text-white/60 mt-1">Try this quick grounding exercise to reduce immediate stress: 4-4-4 breathing, notice five things you can see, and two things you can hear.</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-[#071428] border border-white/6 p-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full bg-green-400" />
                  <div className="font-medium">Counselor Available</div>
                </div>
                <div className="text-xs text-white/60 mt-1">Counselor Available: Green Status Light</div>
                <div className="text-xs text-white/50 mt-1">Chat function coming soon</div>
              </div>
              <div>
                <button className="rounded-md px-3 py-2 bg-white/6 text-white/90">Request Help</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

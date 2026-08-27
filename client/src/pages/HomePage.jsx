import React from "react";
import { Link } from "react-router-dom";
import icon from "../assets/mindbridge-icon.png";

const features = [
  { title: "Wellness check-ins", text: "Track mood, stress, sleep, and focus with a guided student experience." },
  { title: "Appointment flow", text: "Book and manage counseling sessions with fast, clear status updates." },
  { title: "Secure support", text: "Stay connected to real support resources and counselor notes in one place." },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 px-4 py-10 sm:px-6 lg:px-8 text-white">
      <div className="mx-auto w-full max-w-6xl">
        <div className="rounded-[28px] border border-white/10 bg-gray-900/80 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.55)] backdrop-blur-sm sm:p-8 lg:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 flex items-center gap-3">
                <img src={icon} alt="Mind Bridge logo" className="h-11 w-11 rounded-xl object-cover shadow-lg shadow-cyan-500/20" />
                <span className="text-xs uppercase tracking-[0.28em] text-cyan-400">Mind Bridge</span>
              </div>

              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Support that feels calm, clear, and connected.
              </h1>

              <p className="mt-4 max-w-xl text-base text-gray-300 sm:text-lg">
                Help students check in with their wellbeing, book counseling sessions, and stay supported with a modern, welcoming experience.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-xl bg-cyan-600 px-5 py-3 font-semibold text-white transition-all duration-200 hover:bg-cyan-500 hover:scale-[1.01] active:scale-[0.99]"
                >
                  Log in
                </Link>
                <Link
                  to="/student/dashboard"
                  className="inline-flex items-center justify-center rounded-xl border border-gray-700 bg-gray-800 px-5 py-3 font-semibold text-white transition-all duration-200 hover:border-cyan-500 hover:bg-gray-800/90 hover:scale-[1.01] active:scale-[0.99]"
                >
                  Open dashboard
                </Link>
              </div>
            </div>

            <div className="w-full max-w-md rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-gray-900 to-indigo-500/10 p-5">
              <div className="rounded-2xl border border-white/10 bg-gray-950/70 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-cyan-300">Today</span>
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200">Student view</span>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl bg-gray-900 p-3">
                    <div className="text-xs text-gray-400">Mood check</div>
                    <div className="mt-1 text-lg font-semibold text-white">Balanced</div>
                  </div>
                  <div className="rounded-xl bg-gray-900 p-3">
                    <div className="text-xs text-gray-400">Next session</div>
                    <div className="mt-1 text-lg font-semibold text-white">Wed, 10:00 AM</div>
                  </div>
                  <div className="rounded-xl bg-gray-900 p-3">
                    <div className="text-xs text-gray-400">Counselor note</div>
                    <div className="mt-1 text-sm text-gray-200">Follow-up plan shared after consultation.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-white/10 bg-gray-950/60 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-500/40">
                <div className="mb-3 h-10 w-10 rounded-xl bg-cyan-500/10 ring-1 ring-cyan-500/20" />
                <h2 className="text-lg font-semibold text-white">{feature.title}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-300">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

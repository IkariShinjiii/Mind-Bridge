import React from "react";
import { Link } from "react-router-dom";
import {
  LogIn,
  GraduationCap,
  Activity,
  Cpu,
  HeartHandshake,
  BarChart3,
  ShieldCheck,
  Calendar,
  AlertCircle,
} from "lucide-react";
import icon from "../assets/mindbridge-icon.png";
import usaLogo from "../assets/usa-logo.png";

export default function HomePage() {
  return (
    <div className="w-full px-4 py-12 sm:px-6 lg:px-8 text-white flex flex-col justify-between relative font-sans min-h-full pb-20">
      {/* Dynamic Background Glows */}
      <div className="absolute top-12 left-1/4 h-96 w-96 rounded-full bg-teal-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 h-96 w-96 rounded-full bg-sky-600/10 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-indigo-500/5 blur-[160px] pointer-events-none" />

      {/* Main Container */}
      <div className="mx-auto w-full max-w-5xl relative z-10 animate-fade-up">
        
        {/* Top Institutional Badge */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-gray-800 bg-gray-900/90 px-4 py-2 shadow-xl backdrop-blur-md">
            <img src={usaLogo} alt="University of San Agustin seal" className="h-6 w-auto object-contain shadow-sm" />
            <span className="h-3.5 w-px bg-gray-700" />
            <img src={icon} alt="Mind Bridge logo" className="h-5 w-5 rounded-md object-cover shadow-sm" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-400">
              University of San Agustin • Mind Bridge
            </span>
          </div>
        </div>

        {/* Hero Title */}
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl leading-tight font-display">
            Intelligent Student <br />
            <span className="text-teal-400">
              Mental Health Support.
            </span>
          </h1>

          <p className="mt-5 text-sm sm:text-base md:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            A confidential wellness monitoring and AI-assisted clinical triage platform for Augustinian
            students, guidance counselors, and campus administrators.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-8 py-3.5 text-sm font-semibold text-teal-950 shadow-lg shadow-teal-500/20 transition-all hover:bg-teal-400 hover:scale-[1.02] active:scale-[0.98]"
            >
              <LogIn className="h-4 w-4 shrink-0" />
              <span>Log In to Portal</span>
            </Link>
            <Link
              to="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-800/80 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:border-teal-400 hover:text-teal-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <GraduationCap className="h-4 w-4 shrink-0" />
              <span>Create Student Account</span>
            </Link>
          </div>
        </div>

        {/* Impact Statistics */}
        <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 text-center backdrop-blur-sm">
            <div className="text-2xl sm:text-3xl font-extrabold text-teal-400">PHQ-9 & GAD-7</div>
            <div className="mt-1 text-[11px] text-gray-400 font-medium">Dual-Scale Item Bank</div>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 text-center backdrop-blur-sm">
            <div className="text-2xl sm:text-3xl font-extrabold text-white">100%</div>
            <div className="mt-1 text-[11px] text-gray-400 font-medium">Confidential & Encrypted</div>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 text-center backdrop-blur-sm">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">Instant</div>
            <div className="mt-1 text-[11px] text-gray-400 font-medium">Crisis Safety Flagging</div>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 text-center backdrop-blur-sm">
            <div className="text-2xl sm:text-3xl font-extrabold text-sky-400">24/7</div>
            <div className="mt-1 text-[11px] text-gray-400 font-medium">Crisis Hotline Access</div>
          </div>
        </div>

        {/* 3-Step "How It Works" Section */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-teal-400 font-semibold">
              Streamlined Workflow
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1 font-display">
              How Mind Bridge Works
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 font-bold text-sm">
                  1
                </span>
                <div className="h-9 w-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-teal-400" />
                </div>
              </div>
              <h3 className="text-base font-semibold text-white">1-Minute Check-in</h3>
              <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">
                Students complete quick, validated mental wellness check-ins tracking stress, anxiety,
                and emotional distress trends over time.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 font-bold text-sm">
                  2
                </span>
                <div className="h-9 w-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                  <Cpu className="h-5 w-5 text-sky-400" />
                </div>
              </div>
              <h3 className="text-base font-semibold text-white">AI-Assisted Triage</h3>
              <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">
                Algorithms classify distress severity and instantly prioritize high-risk signals for
                campus guidance counselors in an integrated triage queue.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-sm">
                  3
                </span>
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <HeartHandshake className="h-5 w-5 text-emerald-400" />
                </div>
              </div>
              <h3 className="text-base font-semibold text-white">Confidential Care</h3>
              <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">
                Counselors coordinate 1-on-1 sessions, manage availability slots, and provide direct
                support with emergency contact safeguarding.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3 text-left">
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5 backdrop-blur-sm">
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center mb-3 border border-teal-500/20">
              <BarChart3 className="h-5 w-5 text-teal-400" />
            </div>
            <h3 className="font-semibold text-white text-sm mb-1">Wellness Trend Charts</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Interactive historical area charts help students visualize their emotional trajectory and
              stress recovery.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5 backdrop-blur-sm">
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center mb-3 border border-sky-500/20">
              <ShieldCheck className="h-5 w-5 text-sky-400" />
            </div>
            <h3 className="font-semibold text-white text-sm mb-1">RA 11036 Compliance</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Protected under the Philippine Mental Health Act with granular role permissions and
              anonymized reporting.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5 backdrop-blur-sm">
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center mb-3 border border-teal-500/20">
              <Calendar className="h-5 w-5 text-teal-400" />
            </div>
            <h3 className="font-semibold text-white text-sm mb-1">Seamless Booking & Reschedule</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Students and counselors manage confidential appointments with full decline, cancel, and
              reschedule capabilities.
            </p>
          </div>
        </div>

        {/* Crisis Support Banner */}
        <div className="mt-14 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
              <span>Need Immediate Help?</span>
            </div>
            <p className="text-xs text-gray-300 mt-1">
              National Center for Mental Health (NCMH) Crisis Hotline is available 24/7 at{" "}
              <strong className="text-white font-mono">1553</strong> (Toll-Free).
            </p>
          </div>
          <Link
            to="/login"
            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition self-start sm:self-auto shrink-0"
          >
            Access Resources
          </Link>
        </div>

      </div>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-900 pt-6 text-center text-xs text-gray-500">
        <p>© {new Date().getFullYear()} Mind Bridge. University of San Agustin Guidance & Counseling Ecosystem.</p>
      </footer>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PhoneCall, HeartHandshake, Building2, Calendar } from "lucide-react";

export default function CrisisResources() {
  const [breathingState, setBreathingState] = useState("idle"); // idle | inhale | hold | exhale
  const [timer, setTimer] = useState(4);

  useEffect(() => {
    let interval = null;
    if (breathingState === "inhale") {
      interval = setTimeout(() => {
        setBreathingState("hold");
        setTimer(4);
      }, 4000);
    } else if (breathingState === "hold") {
      interval = setTimeout(() => {
        setBreathingState("exhale");
        setTimer(4);
      }, 4000);
    } else if (breathingState === "exhale") {
      interval = setTimeout(() => {
        setBreathingState("inhale");
        setTimer(4);
      }, 4000);
    }
    return () => clearTimeout(interval);
  }, [breathingState]);

  return (
    <div className="mx-auto max-w-5xl animate-fade-up space-y-10">
      {/* Header */}
      <div className="border-b border-[color:var(--mb-line)] pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--mb-ink)] sm:text-3xl font-display">
          Mental Health & Crisis Resources
        </h1>
        <p className="text-sm text-[color:var(--mb-muted)] mt-1">
          Free, confidential, and 24/7 support lines for students in distress, plus guided grounding exercises.
        </p>
      </div>

      {/* Immediate Crisis Hotlines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* NCMH Hotline */}
        <div className="rounded-md border border-[color:var(--mb-urgent)] bg-[color:var(--mb-urgent-bg)] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider bg-[color:var(--mb-urgent-solid)] text-[color:var(--mb-panel-ink)] px-2.5 py-0.5 rounded-full">
                24/7 Nationwide Toll-Free
              </span>
              <div className="h-9 w-9 rounded-md bg-[color:var(--mb-urgent-bg)] border border-[color:var(--mb-urgent)] flex items-center justify-center">
                <PhoneCall className="h-5 w-5 text-[color:var(--mb-urgent)]" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-[color:var(--mb-ink)] mb-1">NCMH Crisis Hotline</h3>
            <p className="text-xs text-[color:var(--mb-muted)] mb-4">
              National Center for Mental Health free psychiatric & crisis counseling support.
            </p>
          </div>
          <div className="space-y-1.5 pt-3 border-t border-[color:var(--mb-urgent)] text-xs font-mono text-[color:var(--mb-brand)]">
            <div>• Toll-Free: <strong className="text-[color:var(--mb-ink)] font-bold text-sm">1553</strong></div>
            <div>• Globe/TM: <strong className="text-[color:var(--mb-ink)] font-bold text-sm">0917-899-8727</strong></div>
            <div>• Smart/Sun/TNT: <strong className="text-[color:var(--mb-ink)] font-bold text-sm">0966-351-4518</strong></div>
          </div>
        </div>

        {/* Hopeline PH */}
        <div className="rounded-md border border-[color:var(--mb-brand)] bg-[color:var(--mb-brand-bg)] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)] px-2.5 py-0.5 rounded-full">
                24/7 Crisis & Suicide Prevention
              </span>
              <div className="h-9 w-9 rounded-md bg-[color:var(--mb-brand-bg)] border border-[color:var(--mb-brand)] flex items-center justify-center">
                <HeartHandshake className="h-5 w-5 text-[color:var(--mb-brand)]" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-[color:var(--mb-ink)] mb-1">Hopeline Philippines</h3>
            <p className="text-xs text-[color:var(--mb-muted)] mb-4">
              24/7 suicide prevention and emotional crisis support hotline in the Philippines.
            </p>
          </div>
          <div className="space-y-1.5 pt-3 border-t border-[color:var(--mb-brand)] text-xs font-mono text-[color:var(--mb-brand)]">
            <div>• Mobile: <strong className="text-[color:var(--mb-ink)] font-bold text-sm">0917-558-4673</strong></div>
            <div>• Smart: <strong className="text-[color:var(--mb-ink)] font-bold text-sm">0918-873-4673</strong></div>
            <div>• PLDT Landline: <strong className="text-[color:var(--mb-ink)] font-bold text-sm">(02) 8804-4673</strong></div>
          </div>
        </div>
      </div>

      {/* University of San Agustin Guidance Center Section */}
      <div className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-md bg-[color:var(--mb-brand-bg)] border border-[color:var(--mb-brand)] flex items-center justify-center">
            <Building2 className="h-5 w-5 text-[color:var(--mb-brand)]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[color:var(--mb-ink)]">University of San Agustin Guidance Center</h3>
            <p className="text-xs text-[color:var(--mb-brand)]">Center for Guidance & Counseling Services (CGCS)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[color:var(--mb-muted)] mb-6">
          <div className="p-3 rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-ground)]">
            <span className="font-semibold text-[color:var(--mb-muted)] block mb-1">Location</span>
            Main Campus, Ground Floor, Blanco Hall
          </div>
          <div className="p-3 rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-ground)]">
            <span className="font-semibold text-[color:var(--mb-muted)] block mb-1">Office Hours</span>
            Monday – Friday, 8:00 AM – 5:00 PM
          </div>
          <div className="p-3 rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-ground)]">
            <span className="font-semibold text-[color:var(--mb-muted)] block mb-1">Confidentiality</span>
            Protected under RA 11036 (Mental Health Act)
          </div>
        </div>

        <Link
          to="/appointments"
          className="inline-flex items-center gap-2 rounded-md bg-[color:var(--mb-panel)] px-5 py-2.5 text-xs font-semibold text-[color:var(--mb-panel-ink)] hover:bg-[color:var(--mb-panel)] transition shadow-sm interactive-tap"
        >
          <Calendar className="h-4 w-4" />
          <span>Book an On-Campus Counseling Session</span>
        </Link>
      </div>

      {/* Interactive Box Breathing Grounding Tool */}
      <div className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-6 sm:p-8 text-center">
        <div className="max-w-md mx-auto">
          <h3 className="text-lg font-bold text-[color:var(--mb-ink)] mb-2">Box Breathing (4-4-4 Technique)</h3>
          <p className="text-xs text-[color:var(--mb-muted)] mb-6">
            Calm your nervous system in 60 seconds with guided rhythmic breathing.
          </p>

          <div className="relative flex items-center justify-center my-8">
            <div
              className={`h-36 w-36 rounded-full border-4 flex items-center justify-center transition-all duration-1000 shadow-sm ${
                breathingState === "inhale"
                  ? "scale-125 border-[color:var(--mb-brand)] bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-brand)]"
                  : breathingState === "hold"
                  ? "scale-125 border-[color:var(--mb-violet)] bg-[color:var(--mb-violet-bg)] text-[color:var(--mb-violet)]"
                  : breathingState === "exhale"
                  ? "scale-90 border-[color:var(--mb-brand)] bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-brand)]"
                  : "border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] text-[color:var(--mb-muted)]"
              }`}
            >
              <div className="text-center font-bold">
                <div className="text-sm uppercase tracking-widest">
                  {breathingState === "idle"
                    ? "Ready"
                    : breathingState === "inhale"
                    ? "Inhale"
                    : breathingState === "hold"
                    ? "Hold"
                    : "Exhale"}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            {breathingState === "idle" ? (
              <button
                onClick={() => setBreathingState("inhale")}
                className="rounded-md bg-[color:var(--mb-panel)] px-6 py-2 text-xs font-semibold text-[color:var(--mb-panel-ink)] hover:bg-[color:var(--mb-panel)] transition shadow-sm"
              >
                Start Breathing Exercise
              </button>
            ) : (
              <button
                onClick={() => setBreathingState("idle")}
                className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] px-5 py-2 text-xs font-medium text-[color:var(--mb-muted)] hover:bg-[color:var(--mb-line)] transition"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

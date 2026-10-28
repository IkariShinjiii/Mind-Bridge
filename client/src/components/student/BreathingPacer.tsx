import { useState, useEffect } from "react";
import PanelHead from "../ui/PanelHead";

type BreathingPhase = "idle" | "inhale" | "hold" | "exhale";
type Pattern = "box" | "relax";

/** Seconds per phase. Box breathing is 4-4-4; the calming pattern is 4 in, 7 hold, 8 out. */
const PATTERNS: Record<Pattern, { label: string; ms: Record<Exclude<BreathingPhase, "idle">, number> }> = {
  box: { label: "Box 4-4-4", ms: { inhale: 4000, hold: 4000, exhale: 4000 } },
  relax: { label: "Calming 4-7-8", ms: { inhale: 4000, hold: 7000, exhale: 8000 } },
};

const PHASES: Record<BreathingPhase, { label: string; next: BreathingPhase }> = {
  idle: { label: "Ready", next: "inhale" },
  inhale: { label: "Inhale", next: "hold" },
  hold: { label: "Hold", next: "exhale" },
  exhale: { label: "Exhale", next: "inhale" },
};

const CIRCLE_TONE: Record<BreathingPhase, string> = {
  idle: "border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] text-[color:var(--mb-muted)]",
  inhale: "scale-125 border-[color:var(--mb-brand)] bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-brand)]",
  hold: "scale-125 border-[color:var(--mb-violet)] bg-[color:var(--mb-violet-bg)] text-[color:var(--mb-violet)]",
  exhale: "scale-90 border-[color:var(--mb-brand)] bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-brand)]",
};

export interface BreathingPacerProps {
  title?: string;
  intro?: string;
  as?: "h2" | "h3";
}

/** A guided breathing circle with two patterns. No sound and nothing stored; the circle stops scaling under reduced motion. */
export default function BreathingPacer({
  title = "Guided breathing",
  intro = "Breathe in, hold, and breathe out with the circle. A minute of this can settle a racing mind.",
  as,
}: BreathingPacerProps) {
  const [pattern, setPattern] = useState<Pattern>("box");
  const [phase, setPhase] = useState<BreathingPhase>("idle");

  // Advance to the next phase after its duration; idle never advances
  useEffect(() => {
    if (phase === "idle") return undefined;
    const t = setTimeout(() => setPhase(PHASES[phase].next), PATTERNS[pattern].ms[phase]);
    return () => clearTimeout(t);
  }, [phase, pattern]);

  const choose = (next: Pattern) => {
    setPattern(next);
    setPhase("idle");
  };

  return (
    <section aria-label="Breathing exercise" className="mb-card">
      <PanelHead title={title} as={as}>
        {intro}
      </PanelHead>

      <div className="flex flex-col items-center gap-6 py-4">
        <div
          role="group"
          aria-label="Breathing pattern"
          className="inline-flex gap-1 rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-ground)] p-1"
        >
          {(Object.keys(PATTERNS) as Pattern[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => choose(key)}
              aria-pressed={pattern === key}
              className={`min-h-[44px] rounded-md px-4 font-bold transition ${
                pattern === key
                  ? "bg-[color:var(--mb-brand)] text-[color:var(--mb-surface)]"
                  : "text-[color:var(--mb-muted)] hover:text-[color:var(--mb-ink)]"
              }`}
            >
              {PATTERNS[key].label}
            </button>
          ))}
        </div>

        <div
          aria-hidden="true"
          className={`flex h-36 w-36 items-center justify-center rounded-full border-4 transition-all duration-1000 motion-reduce:transition-none motion-reduce:!scale-100 ${CIRCLE_TONE[phase]}`}
        >
          <span className="text-lg font-bold uppercase tracking-widest">{PHASES[phase].label}</span>
        </div>
        {/* Screen readers hear each phase change once */}
        <p role="status" aria-live="polite" className="sr-only">
          {phase === "idle" ? "Breathing exercise stopped." : PHASES[phase].label}
        </p>

        {phase === "idle" ? (
          <button type="button" onClick={() => setPhase("inhale")} className="mb-btn mb-btn-solid w-full sm:w-auto">
            Start breathing exercise
          </button>
        ) : (
          <button type="button" onClick={() => setPhase("idle")} className="mb-btn mb-btn-line w-full sm:w-auto">
            Stop
          </button>
        )}
      </div>
    </section>
  );
}

import { Wind, Anchor, ScanLine, Moon } from "lucide-react";
import BreathingPacer from "./BreathingPacer";

interface Exercise {
  icon: typeof Wind;
  title: string;
  summary: string;
  steps: string[];
}

/** Short, text-based self-guided exercises. No audio or external media required. */
const EXERCISES: Exercise[] = [
  {
    icon: Anchor,
    title: "5-4-3-2-1 grounding",
    summary: "Pull your attention back to the present when thoughts race.",
    steps: [
      "Name 5 things you can see",
      "4 things you can hear",
      "3 things you can touch",
      "2 things you can smell",
      "1 thing you can taste",
    ],
  },
  {
    icon: ScanLine,
    title: "Body scan",
    summary: "Release tension you did not know you were holding.",
    steps: [
      "Sit or lie down somewhere comfortable",
      "Slowly move your attention from your toes up to your head",
      "Notice each part of your body, and let it soften",
      "Spend one slow breath on each area",
    ],
  },
  {
    icon: Moon,
    title: "Sleep wind-down",
    summary: "A simple routine to help you fall asleep more easily.",
    steps: [
      "Dim screens about 30 minutes before bed",
      "Keep the same sleep and wake time, even on weekends",
      "Avoid caffeine after the early afternoon",
      "In bed, breathe slowly: longer out-breath than in-breath",
      "Write tomorrow's worries on paper to set them aside",
    ],
  },
];

/**
 * A small, always-available library of relaxation and sleep exercises. The breathing pacer
 * is interactive; the rest are short text guides shown in collapsible cards. Purely
 * self-help content — no scoring or personal data.
 */
export default function RelaxationLibrary() {
  return (
    <section className="mb-card" aria-labelledby="relax-h">
      <h2 id="relax-h" className="text-2xl font-bold text-[color:var(--mb-ink)]">
        Relaxation &amp; sleep
      </h2>
      <p className="mt-1 text-[color:var(--mb-muted)]">
        A few quick tools you can use any time you feel tense or are struggling to wind down.
      </p>

      <div className="mt-4">
        <BreathingPacer
          as="h3"
          label="Relaxation library pacer"
          title="Guided breathing"
          intro="Pick a pattern and follow the circle. Even one minute helps settle a racing mind."
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {EXERCISES.map(({ icon: Icon, title, summary, steps }) => (
          <details key={title} className="mb-tile group">
            <summary className="flex cursor-pointer list-none items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-brand)]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-bold text-[color:var(--mb-ink)]">{title}</span>
                <span className="block text-sm text-[color:var(--mb-muted)]">{summary}</span>
              </span>
            </summary>
            <ol className="mt-3 space-y-1 pl-1 text-sm text-[color:var(--mb-ink)]">
              {steps.map((step, i) => (
                <li key={step} className="flex items-start gap-2">
                  <span className="font-bold text-[color:var(--mb-brand)]">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </details>
        ))}
      </div>
    </section>
  );
}

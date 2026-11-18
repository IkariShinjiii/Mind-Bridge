import { HeartPulse, Heart, Brain, Users, Salad, Dumbbell, Moon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Pillar {
  icon: LucideIcon;
  name: string;
  what: string;
  tips: string[];
}

/** The four pillars of mental health, framed for students. Informational only — no scoring. */
const PILLARS: Pillar[] = [
  {
    icon: HeartPulse,
    name: "Physical",
    what: "Your body and your mind are linked — rest, movement and food all affect how you feel.",
    tips: ["Aim for 7–9 hours of sleep", "Move your body a little each day", "Eat at regular times, stay hydrated"],
  },
  {
    icon: Heart,
    name: "Emotional",
    what: "Noticing and working with your feelings instead of bottling them up.",
    tips: ["Name what you feel", "Talk to someone you trust", "Use a short breathing or relaxation break"],
  },
  {
    icon: Brain,
    name: "Cognitive",
    what: "How you think, focus and handle pressure, especially during heavy academic loads.",
    tips: ["Break big tasks into small steps", "Challenge harsh self-talk", "Take real breaks between study blocks"],
  },
  {
    icon: Users,
    name: "Social",
    what: "Connection and belonging — feeling supported and not alone.",
    tips: ["Reach out to a friend or classmate", "Join a group or activity", "Ask for help when you need it"],
  },
];

/** The everyday-health habits that support all four pillars. */
const HABITS = [
  { icon: Salad, name: "Diet", note: "Regular, balanced meals steady your mood and energy." },
  { icon: Dumbbell, name: "Exercise", note: "Even a short walk lowers stress and lifts mood." },
  { icon: Moon, name: "Sleep", note: "Consistent sleep is one of the strongest protectors of mental health." },
];

/**
 * An informational section introducing the four pillars of mental health and the everyday
 * habits that support them. Purely educational — it carries no scores or personal data.
 */
export default function FourPillars() {
  return (
    <section className="mb-card" aria-labelledby="pillars-h">
      <h2 id="pillars-h" className="text-2xl font-bold text-[color:var(--mb-ink)]">
        The four pillars of mental health
      </h2>
      <p className="mt-1 text-[color:var(--mb-muted)]">
        Looking after these four areas, and the daily habits underneath them, helps your overall wellbeing. Small,
        steady steps count.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {PILLARS.map(({ icon: Icon, name, what, tips }) => (
          <div key={name} className="mb-tile">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-brand)]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="font-bold text-[color:var(--mb-ink)]">{name}</p>
            </div>
            <p className="mt-2 text-sm text-[color:var(--mb-muted)]">{what}</p>
            <ul className="mt-2 space-y-1 text-sm text-[color:var(--mb-ink)]">
              {tips.map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--mb-brand)]" aria-hidden="true" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {HABITS.map(({ icon: Icon, name, note }) => (
          <div key={name} className="mb-tile-sm flex items-start gap-3">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--mb-brand)]" aria-hidden="true" />
            <div>
              <p className="font-bold text-[color:var(--mb-ink)]">{name}</p>
              <p className="text-sm text-[color:var(--mb-muted)]">{note}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

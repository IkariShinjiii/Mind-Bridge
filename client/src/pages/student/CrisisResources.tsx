import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PhoneCall, Phone, HeartHandshake, Building2, Calendar, ArrowLeft, type LucideIcon } from "lucide-react";
import { m } from "framer-motion";
import PanelHead from "../../components/ui/PanelHead";
import { pagePreset, useMotionPreset } from "../../lib/motion";

interface HotlineNumber {
  label: string;
  display: string;
  tel: string;
}

interface Hotline {
  id: string;
  icon: LucideIcon;
  badge: string;
  name: string;
  blurb: string;
  tone: "urgent" | "brand";
  numbers: HotlineNumber[];
}

type BreathingPhase = "idle" | "inhale" | "hold" | "exhale";

const HOTLINES: Hotline[] = [
  {
    id: "ncmh",
    icon: PhoneCall,
    badge: "24/7 nationwide, toll-free",
    name: "NCMH Crisis Hotline",
    blurb: "National Center for Mental Health free psychiatric and crisis counseling support.",
    tone: "urgent",
    numbers: [
      { label: "Toll-free", display: "1553", tel: "1553" },
      { label: "Globe / TM", display: "0917-899-8727", tel: "+639178998727" },
      { label: "Smart / Sun / TNT", display: "0966-351-4518", tel: "+639663514518" },
    ],
  },
  {
    id: "hopeline",
    icon: HeartHandshake,
    badge: "24/7 crisis and suicide prevention",
    name: "Hopeline Philippines",
    blurb: "Suicide prevention and emotional crisis support hotline.",
    tone: "brand",
    numbers: [
      { label: "Mobile", display: "0917-558-4673", tel: "+639175584673" },
      { label: "Smart", display: "0918-873-4673", tel: "+639188734673" },
      { label: "PLDT landline", display: "(02) 8804-4673", tel: "+63288044673" },
    ],
  },
];

const CAMPUS_FACTS = [
  { label: "Location", value: "Main Campus, Ground Floor, Blanco Hall" },
  { label: "Office hours", value: "Monday to Friday, 8:00 AM to 5:00 PM" },
  { label: "Confidentiality", value: "Protected under RA 11036 (Mental Health Act)" },
];

const PHASES: Record<BreathingPhase, { label: string; next: BreathingPhase }> = {
  idle: { label: "Ready", next: "inhale" },
  inhale: { label: "Inhale", next: "hold" },
  hold: { label: "Hold", next: "exhale" },
  exhale: { label: "Exhale", next: "inhale" },
};
const PHASE_MS = 4000;

const CIRCLE_TONE: Record<BreathingPhase, string> = {
  idle: "border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] text-[color:var(--mb-muted)]",
  inhale: "scale-125 border-[color:var(--mb-brand)] bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-brand)]",
  hold: "scale-125 border-[color:var(--mb-violet)] bg-[color:var(--mb-violet-bg)] text-[color:var(--mb-violet)]",
  exhale: "scale-90 border-[color:var(--mb-brand)] bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-brand)]",
};

function HotlineCard({ hotline }: { hotline: Hotline }) {
  const { icon: Icon, badge, name, blurb, tone, numbers } = hotline;
  const urgent = tone === "urgent";
  const edge = urgent ? "border-[color:var(--mb-urgent)]" : "border-[color:var(--mb-brand)]";
  const wash = urgent ? "bg-[color:var(--mb-urgent-bg)]" : "bg-[color:var(--mb-brand-bg)]";
  const ink = urgent ? "text-[color:var(--mb-urgent)]" : "text-[color:var(--mb-brand)]";

  return (
    <section
      aria-labelledby={`hotline-${hotline.id}`}
      className={`mb-card mb-card-interactive flex flex-col border-t-4 ${edge}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className={`mb-badge ${urgent ? "mb-badge-urgent" : "mb-badge-brand"}`}>{badge}</span>
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md ${wash} ${ink}`}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      </div>
      <h2 id={`hotline-${hotline.id}`} className="text-2xl font-bold text-[color:var(--mb-ink)]">
        {name}
      </h2>
      <p className="mt-1 text-[color:var(--mb-muted)]">{blurb}</p>

      <ul className="mt-6 space-y-3">
        {numbers.map((n, i) => (
          <li key={n.tel}>
            <a
              href={`tel:${n.tel}`}
              aria-label={`Call ${name}, ${n.label}, ${n.display}`}
              className={`group flex min-h-[56px] flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md border px-4 py-2 no-underline transition-colors ${edge} ${
                i === 0
                  ? urgent
                    ? "bg-[color:var(--mb-urgent-solid)] text-white hover:brightness-110"
                    : "bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)] hover:brightness-110"
                  : `${wash} text-[color:var(--mb-ink)] hover:bg-[color:var(--mb-surface)]`
              }`}
            >
              <span className="flex items-center gap-3">
                <Phone className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="text-sm font-bold">{n.label}</span>
              </span>
              <span className="mb-sign whitespace-nowrap text-2xl font-bold tabular-nums">{n.display}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function CrisisResources() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<BreathingPhase>("idle");
  const page = useMotionPreset(pagePreset);

  // Advance to the next phase every PHASE_MS; idle never advances
  useEffect(() => {
    if (phase === "idle") return undefined;
    const t = setTimeout(() => setPhase(PHASES[phase].next), PHASE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <m.div {...page} className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 border-b border-[color:var(--mb-line)] pb-6">
        <button type="button" onClick={() => navigate(-1)} className="mb-btn mb-btn-line !px-4 text-sm">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          Back
        </button>
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--mb-ink)] sm:text-4xl">Crisis resources</h1>
          <p className="max-w-[65ch] text-[color:var(--mb-muted)]">
            Free, confidential support lines for students in distress, plus a guided breathing exercise.
          </p>
        </div>
      </div>

      {/* In immediate danger */}
      <p role="note" className="mb-alert font-medium">
        If you or someone near you is in immediate danger, call your local emergency number now.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {HOTLINES.map((h) => (
          <HotlineCard key={h.id} hotline={h} />
        ))}
      </div>

      {/* Campus guidance center */}
      <section aria-labelledby="campus-heading" className="mb-card">
        <div className="mb-6 flex items-start gap-4 border-b border-[color:var(--mb-line)] pb-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[color:var(--mb-brand)] bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-brand)]">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="campus-heading" className="text-2xl font-bold text-[color:var(--mb-ink)]">
              University of San Agustin Guidance Center
            </h2>
            <p className="mt-1 text-[color:var(--mb-muted)]">Center for Guidance and Counseling Services (CGCS)</p>
          </div>
        </div>

        <dl className="grid gap-4 sm:grid-cols-3">
          {CAMPUS_FACTS.map((f) => (
            <div key={f.label} className="mb-tile">
              <dt className="font-bold text-[color:var(--mb-ink)]">{f.label}</dt>
              <dd className="mt-1 text-[color:var(--mb-muted)]">{f.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex justify-end">
          <Link to="/appointments" className="mb-btn mb-btn-solid w-full sm:w-auto">
            <Calendar className="h-5 w-5" aria-hidden="true" />
            Book an on-campus session
          </Link>
        </div>
      </section>

      {/* Box breathing */}
      <section aria-label="Box breathing exercise" className="mb-card">
        <PanelHead title="Box breathing (4-4-4)">
          Breathe in, hold, and breathe out for four seconds each. A minute of this can settle a racing mind.
        </PanelHead>

        <div className="flex flex-col items-center gap-6 py-4">
          <div
            aria-hidden="true"
            className={`flex h-36 w-36 items-center justify-center rounded-full border-4 transition-all duration-1000 motion-reduce:transition-none ${CIRCLE_TONE[phase]}`}
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
    </m.div>
  );
}

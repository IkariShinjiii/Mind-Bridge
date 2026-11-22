import { useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Phone } from "lucide-react";
import { CRISIS_TEXT, SCRIPT, type GuideMode, type Next, type StepId } from "../../lib/onboardingScript";
import { PRESET_GOALS } from "../../lib/goals";
import { MAX_GOALS } from "../../lib/schemas";

export const tourSeenKey = (uid: string) => `mindbridge_onboarded_${uid}`;
export const guideHiddenKey = (uid: string) => `mindbridge_firststeps_hidden_${uid}`;

export function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false; // storage blocked: a short guide is harmless
  }
}
function setFlag(key: string): void {
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* storage blocked: nothing to remember */
  }
}

type Line = { from: "guide" | "you"; text: string };

/**
 * Automated, tap-only welcome guide for a student with no check-ins. It sits inline above the check-in (never a
 * pop-up, so Call 1553 stays reachable) and ends at the check-in. Nothing a student taps is stored; only the optional
 * goals are saved, and only when they press Save.
 */
export default function OnboardingGuide({
  uid,
  name,
  facilitator,
  mode,
  hasGoals,
  onCheckIn,
  onMessage,
  onSaveGoals,
}: {
  uid: string;
  name: string;
  facilitator: string;
  mode: Exclude<GuideMode, "none">;
  hasGoals: boolean;
  onCheckIn: () => void;
  onMessage: () => void;
  onSaveGoals: (goals: string[]) => Promise<void>;
}) {
  const fill = (t: string) => t.replace("{name}", name).replace("{facilitator}", facilitator);
  const first: StepId = mode === "full" ? "greet" : "help";
  const [step, setStep] = useState<StepId>(first);
  const [trail, setTrail] = useState<Line[]>([]);
  const [crisis, setCrisis] = useState(false);
  const [done, setDone] = useState(() => readFlag(guideHiddenKey(uid)));
  const [picked, setPicked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  if (done) return null;

  const finish = () => {
    setFlag(tourSeenKey(uid));
    setFlag(guideHiddenKey(uid));
    setDone(true);
  };
  const go = (next: Next) => {
    setFlag(tourSeenKey(uid));
    if (next === "checkin") {
      finish();
      onCheckIn();
    } else if (next === "done") finish();
    else setStep(next === "goals" && hasGoals ? "handoff" : next);
  };
  const choose = (label: string, reply: string | undefined, next: Next) => {
    const text = step === "goals" ? "" : fill(SCRIPT[step].text);
    setTrail((t) => [
      ...t,
      ...(text ? [{ from: "guide" as const, text }] : []),
      { from: "you", text: label },
      ...(reply ? [{ from: "guide" as const, text: fill(reply) }] : []),
    ]);
    go(next);
  };
  const toggle = (g: string) =>
    setPicked((p) => (p.includes(g) ? p.filter((x) => x !== g) : p.length >= MAX_GOALS ? p : [...p, g]));
  const saveGoals = async () => {
    setSaving(true);
    setSaveError("");
    try {
      await onSaveGoals(picked);
      setTrail((t) => [
        ...t,
        { from: "you", text: `Saved ${picked.length} ${picked.length === 1 ? "goal" : "goals"}` },
      ]);
      go("handoff");
    } catch {
      setSaveError("Could not save your goals. You can set them later in Settings.");
    } finally {
      setSaving(false);
    }
  };

  const current = step === "goals" ? null : SCRIPT[step];

  return (
    <section aria-labelledby="guide-h" className="mb-card">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-[color:var(--mb-brand)]" aria-hidden="true" />
        <h2 id="guide-h" className="text-2xl font-bold text-[color:var(--mb-ink)]">
          Automated guide
        </h2>
      </div>

      <div role="log" aria-live="polite" className="mt-3 space-y-2">
        {trail.map((l, i) => (
          <p
            key={i}
            className={`max-w-[60ch] rounded-lg px-3 py-2 ${l.from === "guide" ? "mb-tile text-[color:var(--mb-ink)]" : "ml-auto w-fit bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-ink)]"}`}
          >
            {l.text}
          </p>
        ))}
        {crisis ? (
          <div className="mb-plate-amber space-y-2 rounded-lg p-4">
            <p>{fill(CRISIS_TEXT)}</p>
            <div className="flex flex-wrap gap-3">
              <a href="tel:1553" className="mb-btn mb-btn-solid">
                <Phone className="h-4 w-4" aria-hidden="true" />
                Call 1553
              </a>
              <button type="button" className="mb-btn mb-btn-line" onClick={onMessage}>
                Message {facilitator}
              </button>
              <Link to="/resources" className="mb-btn mb-btn-line">
                More crisis resources
              </Link>
            </div>
          </div>
        ) : current ? (
          <p className="mb-tile max-w-[60ch] rounded-lg px-3 py-2 text-[color:var(--mb-ink)]">{fill(current.text)}</p>
        ) : (
          <p className="mb-tile max-w-[60ch] rounded-lg px-3 py-2 text-[color:var(--mb-ink)]">
            Pick up to {MAX_GOALS} things you would like to work on, or skip this. You can change them in Settings.
          </p>
        )}
      </div>

      {!crisis && current && (
        <div className="mt-3 flex flex-wrap gap-2">
          {current.choices.map((c) => (
            <button
              key={c.id}
              type="button"
              className="mb-btn mb-btn-line !min-h-[44px]"
              onClick={() => choose(c.label, c.reply, c.next)}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {!crisis && !current && (
        <div className="mt-3">
          <div role="group" aria-label="Goals" className="flex flex-wrap gap-2">
            {PRESET_GOALS.map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={picked.includes(g)}
                onClick={() => toggle(g)}
                className={`mb-btn !min-h-[44px] ${picked.includes(g) ? "mb-btn-solid" : "mb-btn-line"}`}
              >
                {g}
              </button>
            ))}
          </div>
          {saveError && (
            <p role="alert" className="mb-alert mt-2 font-medium">
              {saveError}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="mb-btn mb-btn-solid"
              disabled={picked.length === 0 || saving}
              onClick={() => void saveGoals()}
            >
              Save these goals
            </button>
            <button
              type="button"
              className="mb-btn mb-btn-line"
              onClick={() => choose("Not now", undefined, "handoff")}
            >
              Not now
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-[color:var(--mb-line)] pt-3 text-sm">
        {!crisis && (
          <button
            type="button"
            className="inline-flex min-h-[44px] items-center font-bold underline"
            onClick={() => setCrisis(true)}
          >
            I need help now
          </button>
        )}
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center font-bold text-[color:var(--mb-muted)] underline"
          onClick={() => {
            finish();
            onCheckIn();
          }}
        >
          Skip to check-in
        </button>
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center text-[color:var(--mb-muted)] underline"
          onClick={finish}
        >
          Hide this guide
        </button>
      </div>
    </section>
  );
}

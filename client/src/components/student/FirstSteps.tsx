import { useState } from "react";
import { HeartPulse, Wind, MessageSquare } from "lucide-react";

/** Per-user key so a student who hides the guide does not see it again in this browser. */
const hiddenKey = (uid: string) => `mindbridge_firststeps_hidden_${uid}`;

function isHidden(uid: string): boolean {
  try {
    return localStorage.getItem(hiddenKey(uid)) === "1";
  } catch {
    return false; // storage blocked: showing a small guide is harmless
  }
}

/**
 * A gentle three-step guide for a student who has not taken a check-in yet. It names one thing to do now and two
 * things that are there later, in any order, so the page never asks for more than one decision at a time.
 * It disappears on its own after the first check-in, or when the student hides it.
 */
export default function FirstSteps({
  uid,
  onCheckIn,
  onRelax,
  onMessage,
}: {
  uid: string | undefined;
  onCheckIn: () => void;
  onRelax: () => void;
  onMessage: () => void;
}) {
  const [hidden, setHidden] = useState(() => !uid || isHidden(uid));
  if (hidden || !uid) return null;

  const hide = () => {
    try {
      localStorage.setItem(hiddenKey(uid), "1");
    } catch {
      /* storage blocked: nothing to remember */
    }
    setHidden(true);
  };

  const steps = [
    {
      icon: HeartPulse,
      title: "Check in, about a minute",
      body: "A few questions about how you have been. Nothing is a wrong answer.",
      label: "Start",
      action: onCheckIn,
      main: true,
    },
    {
      icon: Wind,
      title: "Take a calm moment",
      body: "A breathing exercise and sleep tips, whenever you want them.",
      label: "Open",
      action: onRelax,
      main: false,
    },
    {
      icon: MessageSquare,
      title: "Talk to someone, if you want to",
      body: "Message a peer facilitator or book a session. It is always your choice.",
      label: "Open",
      action: onMessage,
      main: false,
    },
  ];

  return (
    <section aria-labelledby="first-steps-h" className="mb-card">
      <h2 id="first-steps-h" className="text-2xl font-bold text-[color:var(--mb-ink)]">
        Where to begin
      </h2>
      <p className="mt-1 text-[color:var(--mb-muted)]">No rush. Start with step 1, or pick whatever feels right.</p>
      <ol className="mt-4 space-y-3">
        {steps.map(({ icon: Icon, title, body, label, action, main }, i) => (
          <li key={title} className="mb-tile mb-tile-sm flex items-center gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-ink)]">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[color:var(--mb-ink)]">
                {i + 1}. {title}
              </p>
              <p className="hidden text-sm text-[color:var(--mb-muted)] sm:block">{body}</p>
            </div>
            <button
              type="button"
              onClick={action}
              className={`mb-btn ${main ? "mb-btn-solid" : "mb-btn-line"} shrink-0 !min-h-[44px] !px-4 text-sm`}
            >
              {label}
              <span className="sr-only"> {title}</span>
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={hide}
        className="mt-3 inline-flex min-h-[44px] items-center text-sm font-bold text-[color:var(--mb-muted)] underline"
      >
        Hide this guide
      </button>
    </section>
  );
}

import { useState } from "react";
import { HeartPulse, Lock, LifeBuoy } from "lucide-react";
import Modal from "../ui/Modal";

const STEPS = [
  {
    icon: HeartPulse,
    title: "Welcome to Mind Bridge",
    body: "A one-minute check-in about how you have been feeling lately. It helps you notice patterns, and it connects you to guidance staff when you want support.",
  },
  {
    icon: Lock,
    title: "Your check-in is confidential",
    body: "Only you and approved guidance staff can see your answers. The result is a screening aid, never a diagnosis, and you choose whether to book a session or send a message.",
  },
  {
    icon: LifeBuoy,
    title: "Help is always one tap away",
    body: "If you ever need urgent help, the Crisis resources page lists hotlines you can call right now, including the NCMH hotline at 1553. Answers that suggest urgency are flagged for staff in confidence.",
  },
] as const;

/** Per-user key so each student sees the tour once per browser. */
const seenKey = (uid: string) => `mindbridge_onboarded_${uid}`;

// shortcut: "seen" lives in localStorage, so a new browser or device shows the tour again. Move it to the user profile if that matters.
function hasSeen(uid: string): boolean {
  try {
    return localStorage.getItem(seenKey(uid)) === "1";
  } catch {
    return true; // storage blocked: skip the tour rather than show it on every visit
  }
}

/**
 * First-visit welcome tour for students: three short steps ending in one call to action that
 * takes them to the check-in. Dismissing it at any step also marks it as seen.
 */
export default function StudentOnboarding({ uid, onStart }: { uid: string | undefined; onStart: () => void }) {
  const [open, setOpen] = useState(() => !!uid && !hasSeen(uid));
  const [step, setStep] = useState(0);
  if (!uid) return null;

  const finish = (start: boolean) => {
    try {
      localStorage.setItem(seenKey(uid), "1");
    } catch {
      /* storage blocked: nothing to remember */
    }
    setOpen(false);
    if (start) onStart();
  };

  const { icon: Icon, title, body } = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <Modal
      isOpen={open}
      onClose={() => finish(false)}
      title={title}
      maxWidth="max-w-md"
      footer={
        <>
          {step > 0 && (
            <button type="button" className="mb-btn mb-btn-line" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          {last ? (
            <button type="button" className="mb-btn mb-btn-solid" onClick={() => finish(true)}>
              Start my first check-in
            </button>
          ) : (
            <button type="button" className="mb-btn mb-btn-solid" onClick={() => setStep(step + 1)}>
              Next
            </button>
          )}
        </>
      }
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <Icon className="h-12 w-12 text-[color:var(--mb-ink)]" aria-hidden="true" />
        <p className="text-[color:var(--mb-ink)]">{body}</p>
        <p className="text-sm text-[color:var(--mb-muted)]" aria-live="polite">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
    </Modal>
  );
}

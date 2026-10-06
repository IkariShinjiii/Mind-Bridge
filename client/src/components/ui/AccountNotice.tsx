import { useState } from "react";
import type { AccountStatus } from "../../utils/accountStatus";

export interface AccountNoticeProps {
  /** Which notice to show. An "active" account never needs one. */
  status: Exclude<AccountStatus, "active">;
  /** Re-reads the profile. Offered while an account is waiting for approval or could not be loaded. */
  onCheckAgain?: () => Promise<void>;
  /** Sends the verification email again. Offered only while an email is waiting to be verified. */
  onResend?: () => Promise<void>;
  onLogout: () => void;
}

const COPY = {
  "pending-approval": {
    label: "Waiting for approval",
    title: "Your staff account is waiting for approval",
    body: "An administrator needs to approve it before you can see student check-ins. That keeps student information private. You will get in as soon as they do.",
  },
  unverified: {
    label: "Verify your email",
    title: "Check your inbox to verify your email",
    body: "We sent a link to your school email. Open it to confirm the address is yours, then come back and press Check again. That keeps one person from signing up with someone else's address.",
  },
  unavailable: {
    label: "Could not load your account",
    title: "We could not load your account",
    body: "Something went wrong while reading your profile, so Mind Bridge cannot tell what you have access to. Check your connection and try again.",
  },
  deactivated: {
    label: "Account deactivated",
    title: "This account has been deactivated",
    body: "You cannot use Mind Bridge with it right now. If you think this is a mistake, contact a Mind Bridge administrator.",
  },
} as const;

/** Shown in place of the app for an account that is signed in but not allowed in yet (or any more). */
export default function AccountNotice({ status, onCheckAgain, onResend, onLogout }: AccountNoticeProps) {
  const copy = COPY[status];
  const [checking, setChecking] = useState(false);
  const [stillWaiting, setStillWaiting] = useState(false);
  const [resendNote, setResendNote] = useState("");

  async function resend() {
    if (!onResend) return;
    setResendNote("");
    try {
      await onResend();
      setResendNote("Sent. Check your inbox and spam folder.");
    } catch {
      setResendNote("Could not send it just now. Wait a minute and try again.");
    }
  }

  async function checkAgain() {
    if (!onCheckAgain) return;
    setChecking(true);
    setStillWaiting(false);
    try {
      await onCheckAgain();
      // If the account had been approved, this screen is already gone; reaching here means nothing changed.
      setStillWaiting(true);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <section className="mb-plate p-8" aria-labelledby="account-notice-title">
        <p className="text-sm font-bold uppercase tracking-wide text-[color:var(--mb-panel-soft)]">{copy.label}</p>
        <h1 id="account-notice-title" className="mb-sign mt-2 text-4xl font-bold">
          {copy.title}
        </h1>
        <p className="mt-3 max-w-[55ch] text-[color:var(--mb-panel-soft)]">{copy.body}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          {(status === "pending-approval" || status === "unavailable" || status === "unverified") && onCheckAgain && (
            <button
              type="button"
              onClick={() => void checkAgain()}
              disabled={checking}
              className="mb-btn !border-[color:var(--mb-panel-ink)] bg-[color:var(--mb-panel-ink)] text-[color:var(--mb-panel)]"
            >
              {checking ? "Checking…" : "Check again"}
            </button>
          )}
          {status === "unverified" && onResend && (
            <button
              type="button"
              onClick={() => void resend()}
              className="mb-btn !border-[color:var(--mb-panel-ink)] bg-transparent text-[color:var(--mb-panel-ink)] hover:bg-white/10"
            >
              Resend email
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="mb-btn !border-[color:var(--mb-panel-ink)] bg-transparent text-[color:var(--mb-panel-ink)] hover:bg-white/10"
          >
            Log out
          </button>
        </div>

        <p role="status" className="mt-4 min-h-[1.5rem] text-[color:var(--mb-panel-soft)]">
          {resendNote || (stillWaiting ? status === "unverified" ? "Not verified yet." : status === "unavailable" ? "Still could not load it." : "Still waiting. Nothing has changed yet." : "")}
        </p>
      </section>
    </div>
  );
}

import { useState } from "react";
import { resendVerification } from "../api";
import { useAuth } from "../AuthContext.jsx";

export default function VerifyEmailNotice() {
  const { user, refreshUser } = useAuth();
  const [sent, setSent] = useState(null); // devVerifyLink, if in dev mode
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleResend() {
    setSending(true);
    const res = await resendVerification();
    setSent(res.devVerifyLink || "sent");
    setSending(false);
  }

  async function handleCheck() {
    setChecking(true);
    await refreshUser();
    setChecking(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-mist px-6">
      <div className="max-w-md text-center">
        <p className="text-teal font-semibold tracking-widest text-xs mb-2">
          ONE MORE STEP
        </p>
        <h1 className="font-display text-2xl text-ink mb-3">Verify your email</h1>
        <p className="text-ink/60 mb-6">
          We sent a verification link to <strong>{user.email}</strong>. Click
          it, then come back here.
        </p>

        {sent && sent !== "sent" && (
          <a
            href={sent}
            target="_blank"
            rel="noreferrer"
            className="inline-block bg-teal text-ink font-semibold rounded-lg px-5 py-2.5 mb-4 hover:brightness-95"
          >
            Dev mode: click to verify
          </a>
        )}
        {sent === "sent" && (
          <p className="text-sm text-emerald-700 mb-4">Verification email sent.</p>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={handleResend}
            disabled={sending}
            className="text-sm border border-ink/15 rounded-lg px-4 py-2 hover:border-ink/40 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Resend email"}
          </button>
          <button
            onClick={handleCheck}
            disabled={checking}
            className="text-sm bg-ink text-white rounded-lg px-4 py-2 hover:brightness-110 disabled:opacity-50"
          >
            {checking ? "Checking…" : "I've verified"}
          </button>
        </div>
      </div>
    </div>
  );
}

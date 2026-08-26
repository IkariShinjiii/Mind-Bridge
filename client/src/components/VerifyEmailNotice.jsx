import { useState } from "react";
import { resendVerification } from "../api";
import { useAuth } from "../AuthContext.jsx";

export default function VerifyEmailNotice() {
  const { user, refreshUser } = useAuth();
  const [sent, setSent] = useState(null);
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-mist via-[#eef1f8] to-[#e8f5f1] px-4 py-8 sm:px-6">
      <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-teal/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-ink/10 blur-3xl" />

      <div className="animate-fade-up relative w-full max-w-md rounded-[30px] border border-ink/5 bg-white/95 p-6 text-center shadow-[0_20px_60px_rgba(17,24,39,0.12)] transition-all duration-200 hover:shadow-[0_24px_70px_rgba(17,24,39,0.16)] sm:p-8">
        <p className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-teal sm:text-xs">ONE MORE STEP</p>
        <h1 className="mb-3 font-display text-2xl text-ink sm:text-3xl">Verify your email</h1>
        <p className="mb-6 text-sm text-ink/60 sm:text-base">
          We sent a verification link to <strong className="text-ink">{user.email}</strong>.
          Click it, then come back here to continue.
        </p>

        {sent && sent !== "sent" && (
          <a
            href={sent}
            target="_blank"
            rel="noreferrer"
            className="soft-button inline-block w-full rounded-lg bg-teal px-5 py-3 text-sm font-semibold text-ink hover:brightness-95"
          >
            Dev mode: verify email
          </a>
        )}
        {sent === "sent" && (
          <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Verification email sent.
          </p>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={handleResend}
            disabled={sending}
            className="soft-button flex-1 rounded-lg border border-ink/15 px-4 py-2.5 text-sm font-medium text-ink hover:border-ink/40 hover:bg-mist disabled:opacity-50"
          >
            {sending ? "Sending…" : "Resend email"}
          </button>
          <button
            onClick={handleCheck}
            disabled={checking}
            className="soft-button flex-1 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
          >
            {checking ? "Checking…" : "I've verified"}
          </button>
        </div>
      </div>
    </div>
  );
}

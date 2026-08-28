import React, { useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import icon from "../assets/mindbridge-icon.png";

export default function VerifyEmailNotice() {
  const { currentUser, refreshUserData } = useAuth();
  const [checking, setChecking] = useState(false);

  async function handleCheck() {
    setChecking(true);
    await refreshUserData();
    setChecking(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 font-sans text-white">
      <div className="bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl p-8 border border-gray-800 text-center animate-fade-up">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-2xl">
          ✉️
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-semibold mb-1">
          Email Verification
        </p>
        <h1 className="text-2xl font-bold text-white mb-3">Verify Your Email</h1>
        <p className="text-sm text-gray-300 mb-6 leading-relaxed">
          Please check your inbox at <strong className="text-cyan-300 font-mono">{currentUser?.email}</strong> and follow the link to complete verification.
        </p>

        <button
          onClick={handleCheck}
          disabled={checking}
          className="w-full rounded-xl bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 transition disabled:opacity-50"
        >
          {checking ? "Checking Status…" : "I've Verified My Email"}
        </button>
      </div>
    </div>
  );
}

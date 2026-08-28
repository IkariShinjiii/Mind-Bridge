import React from "react";
import { useAuth } from "../AuthContext.jsx";
import icon from "../assets/mindbridge-icon.png";

export default function PendingApproval() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 font-sans text-white">
      <div className="bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl p-8 border border-gray-800 text-center animate-fade-up">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-2xl">
          ⏳
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-amber-400 font-semibold mb-1">
          Account Pending Approval
        </p>
        <h1 className="text-2xl font-bold text-white mb-3">Waiting on Admin Review</h1>
        <p className="text-sm text-gray-300 mb-6 leading-relaxed">
          Your Counselor account has been registered, but an Administrator needs to verify and approve your account before you can access confidential student check-ins and appointments.
        </p>
        <button
          onClick={() => logout()}
          className="w-full rounded-xl border border-gray-700 bg-gray-800 py-2.5 text-sm font-medium text-gray-200 hover:bg-gray-700 hover:text-white transition"
        >
          Log out
        </button>
      </div>
    </div>
  );
}

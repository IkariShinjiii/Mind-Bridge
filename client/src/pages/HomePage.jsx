import React from "react";
import { Link } from "react-router-dom";
import icon from "../assets/mindbridge-icon.png";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 px-4 py-16 sm:px-6 lg:px-8 text-white flex items-center justify-center overflow-hidden relative">
      
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="mx-auto w-full max-w-4xl text-center relative z-10 animate-fade-up">
        
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-gray-800 bg-gray-900/80 px-4 py-2 shadow-lg backdrop-blur-md">
            <img src={icon} alt="Mind Bridge logo" className="h-6 w-6 rounded-md object-cover shadow-sm" />
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-400">Mind Bridge System</span>
          </div>
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
          Student support, <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">simplified.</span>
        </h1>

        <p className="mt-6 mx-auto max-w-2xl text-lg text-gray-400 leading-relaxed">
          The all-in-one platform for universities to manage student wellbeing. Track wellness check-ins, manage high-risk cases, and streamline counseling appointments securely.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-cyan-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:bg-cyan-500 hover:scale-105"
          >
            Log in to Portal
          </Link>
          <Link
            to="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-gray-700 bg-gray-800/80 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:border-cyan-500 hover:text-cyan-300 hover:scale-105"
          >
            Create Student Account
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-6 sm:grid-cols-3 text-left">
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm">
            <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4 border border-cyan-500/20">
              <span className="text-cyan-400 text-lg">📊</span>
            </div>
            <h3 className="font-semibold text-white mb-2">Automated Triage</h3>
            <p className="text-sm text-gray-400">Intelligent scoring automatically flags high-risk student assessments for immediate counselor review.</p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4 border border-purple-500/20">
              <span className="text-purple-400 text-lg">🔒</span>
            </div>
            <h3 className="font-semibold text-white mb-2">Role-Based Access</h3>
            <p className="text-sm text-gray-400">Strict data siloing ensures students, counselors, and admins only see the data they are authorized to access.</p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 border border-blue-500/20">
              <span className="text-blue-400 text-lg">📅</span>
            </div>
            <h3 className="font-semibold text-white mb-2">Seamless Booking</h3>
            <p className="text-sm text-gray-400">Students can request counseling sessions instantly without navigating external scheduling tools.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
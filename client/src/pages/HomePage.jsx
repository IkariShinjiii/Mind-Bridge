import React from "react";
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 font-sans text-white">
      <div className="w-full max-w-3xl">
        <div className="rounded-2xl bg-gray-900 p-8 border border-gray-800 shadow-lg">
          <h1 className="text-3xl font-bold mb-2">Welcome to Mind Bridge</h1>
          <p className="text-white/70 mb-6">Your student wellness companion. Use the links below to explore the app.</p>

          <div className="flex gap-3">
            <Link to="/student/dashboard" className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-md px-4 py-2">Open Student Dashboard</Link>
            <Link to="/login" className="border border-gray-700 text-white rounded-md px-4 py-2">Login (if available)</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

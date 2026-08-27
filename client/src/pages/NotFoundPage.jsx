import React from "react";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 text-white">
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center shadow-2xl max-w-md w-full">
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-400 mb-3">404</p>
        <h1 className="text-3xl font-bold mb-2">Page not found</h1>
        <p className="text-gray-300 mb-6">The page you’re looking for does not exist or may have moved.</p>
        <Link to="/" className="inline-block bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg px-5 py-2.5 transition-all duration-200">
          Back to home
        </Link>
      </div>
    </div>
  );
}

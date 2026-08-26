import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Placeholder imports - replace paths if your project structure differs
import HomePage from "./pages/HomePage";
import StudentDashboard from "./components/StudentDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-white flex flex-col font-sans">
        {/* App header / shell (keeps consistent styling across routes) */}
        <header className="bg-gray-900 border-b border-white/6">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="font-bold text-lg">Mind Bridge</div>
            <nav className="hidden md:flex items-center gap-4">
              {/* Add global nav items here as needed */}
            </nav>
          </div>
        </header>

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/student/dashboard" element={<StudentDashboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

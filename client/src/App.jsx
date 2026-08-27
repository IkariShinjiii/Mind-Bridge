import React from "react";
import { Link, Navigate, Routes, Route, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

import HomePage from "./pages/HomePage";
import StudentDashboard from "./components/StudentDashboard";
import Login from "./components/Login";
import Signup from "./components/Signup";
import NotFoundPage from "./pages/NotFoundPage";
import icon from "./assets/mindbridge-icon.png";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white/70">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white/70">Loading…</div>;
  }

  if (user) {
    return <Navigate to="/student/dashboard" replace />;
  }

  return children;
}

function AppShell() {
  const location = useLocation();
  const hideChrome = location.pathname === "/login" || location.pathname === "/signup";

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col font-sans">
      {!hideChrome && (
        <header className="sticky top-0 z-20 border-b border-white/10 bg-gray-950/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <img src={icon} alt="Mind Bridge logo" className="h-8 w-8 rounded-md object-cover" />
              <div className="text-lg font-semibold tracking-tight">Mind Bridge</div>
            </div>
            <nav className="hidden items-center gap-4 text-sm text-gray-300 md:flex">
              <Link to="/" className="transition hover:text-white">Home</Link>
              <Link to="/student/dashboard" className="transition hover:text-white">Dashboard</Link>
              <Link to="/login" className="rounded-lg border border-gray-700 px-3 py-1.5 transition hover:border-cyan-500 hover:text-white">Login</Link>
            </nav>
          </div>
        </header>
      )}

      <main className={hideChrome ? "flex-1 w-full" : "mx-auto flex w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8"}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/signup" element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />
          <Route path="/student/dashboard" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return <AppShell />;
}

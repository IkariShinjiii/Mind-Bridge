import React from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

import HomePage from "./pages/HomePage";
import StudentDashboard from "./components/StudentDashboard";
import Login from "./components/Login";
import NotFoundPage from "./pages/NotFoundPage";

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
  const hideChrome = location.pathname === "/login";

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col font-sans">
      {!hideChrome && (
        <header className="bg-gray-900 border-b border-white/6">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="font-bold text-lg">Mind Bridge</div>
            <nav className="hidden md:flex items-center gap-4">
              {/* Add global nav items here as needed */}
            </nav>
          </div>
        </header>
      )}

      <main className={hideChrome ? "flex-1 w-full" : "flex-1 w-full max-w-6xl mx-auto px-4 py-8"}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
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

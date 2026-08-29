import React from "react";
import { Link, Navigate, Routes, Route, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./AuthContext.jsx";

import HomePage from "./pages/HomePage";
import StudentDashboard from "./components/StudentDashboard";
import CounselorDashboard from "./components/CounselorDashboard";
import AdminPanel from "./components/AdminPanel";
import Login from "./components/Login";
import Signup from "./components/Signup";
import UserSettings from "./components/UserSettings";
import Appointments from "./components/Appointments";
import CrisisResources from "./components/CrisisResources";
import NotFoundPage from "./pages/NotFoundPage";
import DashboardLayout from "./components/DashboardLayout";
import icon from "./assets/mindbridge-icon.png";

function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-[100dvh] w-full bg-gray-950 flex items-center justify-center text-white/70">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span className="text-xs text-gray-400">Loading session…</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    const redirectPath =
      userRole === "admin"
        ? "/admin/dashboard"
        : userRole === "counselor"
        ? "/counselor/dashboard"
        : "/student/dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

function PublicOnlyRoute({ children }) {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-[100dvh] w-full bg-gray-950 flex items-center justify-center text-white/70">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span className="text-xs text-gray-400">Loading session…</span>
        </div>
      </div>
    );
  }

  if (currentUser) {
    const redirectPath =
      userRole === "admin"
        ? "/admin/dashboard"
        : userRole === "counselor"
        ? "/counselor/dashboard"
        : "/student/dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-gray-950 text-gray-100 font-sans">
      <div className="app-mesh-bg" aria-hidden="true" />
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {children}
      </div>
    </div>
  );
}

function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-gray-950/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3 group interactive-tap">
          <img src={icon} alt="Mind Bridge logo" className="h-8 w-8 rounded-xl object-cover shadow-md transition-transform group-hover:scale-105" />
          <div className="text-lg font-bold tracking-tight text-white">
            Mind Bridge
          </div>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link to="/login" className="min-h-[40px] flex items-center rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs font-semibold text-teal-300 hover:bg-teal-500/20 transition interactive-tap">
            Sign In
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-gray-950 text-white flex flex-col font-sans">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-gray-950 text-gray-100 font-sans">
              <div className="app-mesh-bg" aria-hidden="true" />
              <Navbar />
              <div className="relative flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                <HomePage />
              </div>
            </div>
          }
        />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicOnlyRoute>
              <Signup />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/counselor/dashboard"
          element={
            <ProtectedRoute allowedRoles={["counselor"]}>
              <CounselorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/appointments"
          element={
            <ProtectedRoute allowedRoles={["student", "counselor", "admin"]}>
              <Appointments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resources"
          element={
            <ProtectedRoute allowedRoles={["student", "counselor", "admin"]}>
              <CrisisResources />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={["student", "counselor", "admin"]}>
              <UserSettings />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

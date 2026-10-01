import React, { lazy, Suspense } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./context/AuthContext.jsx";

import HomePage from "./pages/HomePage";
const StudentDashboard = lazy(() => import("./features/student/StudentDashboard"));
const AdminPanel = lazy(() => import("./features/staff/AdminPanel"));
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
const UserSettings = lazy(() => import("./features/settings/UserSettings"));
const Appointments = lazy(() => import("./features/appointments/Appointments"));
const CrisisResources = lazy(() => import("./features/student/CrisisResources"));
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import CookiePolicy from "./pages/CookiePolicy";
import NotFoundPage from "./pages/NotFoundPage";
import DashboardLayout from "./components/layout/DashboardLayout";
import CookieConsent from "./components/ui/CookieConsent";

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
      userRole === "admin" || userRole === "counselor"
        ? "/admin/dashboard"
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
      userRole === "admin" || userRole === "counselor"
        ? "/admin/dashboard"
        : "/student/dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

export default function App() {
  const location = useLocation();

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-gray-950 text-white flex flex-col font-sans">
      <CookieConsent />
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" /></div>}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
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
          element={<Navigate to="/admin/dashboard" replace />}
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
            <ProtectedRoute allowedRoles={["student", "admin"]}>
              <Appointments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resources"
          element={
            <ProtectedRoute allowedRoles={["student", "admin"]}>
              <CrisisResources />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={["student", "admin"]}>
              <UserSettings />
            </ProtectedRoute>
          }
        />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
    </div>
  );
}

import React from "react";
import { Link, Navigate, Routes, Route } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

import HomePage from "./pages/HomePage";
import StudentDashboard from "./components/StudentDashboard";
import CounselorDashboard from "./components/CounselorDashboard";
import AdminPanel from "./components/AdminPanel";
import Login from "./components/Login";
import Signup from "./components/Signup";
import UserSettings from "./components/UserSettings";
import NotFoundPage from "./pages/NotFoundPage";
import DashboardLayout from "./components/DashboardLayout";
import icon from "./assets/mindbridge-icon.png";

function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white/70">Loading…</div>;
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
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white/70">Loading…</div>;
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

  return children;
}

function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-gray-950/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <img src={icon} alt="Mind Bridge logo" className="h-8 w-8 rounded-md object-cover" />
          <div className="text-lg font-semibold tracking-tight">Mind Bridge</div>
        </div>
        <nav className="hidden items-center gap-4 text-sm text-gray-300 md:flex">
          <Link to="/" className="transition hover:text-white">Home</Link>
          <Link to="/login" className="rounded-lg border border-gray-700 px-3 py-1.5 transition hover:border-cyan-500 hover:text-white">Login</Link>
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col font-sans">
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Navbar />
              <main className="mx-auto flex w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
                <HomePage />
              </main>
            </>
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

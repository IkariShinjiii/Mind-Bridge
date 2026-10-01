import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";

import HomePage from "./pages/HomePage";
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const AdminPanel = lazy(() => import("./pages/staff/AdminPanel"));
const Login = lazy(() => import("./pages/auth/Login"));
const Signup = lazy(() => import("./pages/auth/Signup"));
const UserSettings = lazy(() => import("./pages/settings/UserSettings"));
const Appointments = lazy(() => import("./pages/appointments/Appointments"));
const CrisisResources = lazy(() => import("./pages/student/CrisisResources"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
import NotFoundPage from "./pages/NotFoundPage";
import DashboardLayout from "./components/layout/DashboardLayout";
import CookieConsent from "./components/ui/CookieConsent";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import PageLoader from "./components/ui/PageLoader";
import type { UserRole } from "./types";

function ProtectedRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles?: UserRole[] }) {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return <PageLoader label="Loading session…" />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
    const redirectPath = userRole === "admin" ? "/admin/dashboard" : "/student/dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return <PageLoader label="Loading session…" />;
  }

  if (currentUser) {
    const redirectPath = userRole === "admin" ? "/admin/dashboard" : "/student/dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

export default function App() {
  const location = useLocation();

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-gray-950 text-white flex flex-col font-sans">
      <CookieConsent />
      <ErrorBoundary resetKey={location.pathname}>
        <Suspense fallback={<PageLoader />}>
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
            <Route path="/counselor/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
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
      </ErrorBoundary>
    </div>
  );
}

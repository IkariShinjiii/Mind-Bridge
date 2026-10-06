import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, m } from "framer-motion";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "./lib/firebase";
import { pagePreset, useMotionPreset } from "./lib/motion";
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
import AccountNotice from "./components/ui/AccountNotice";
import CookieConsent from "./components/ui/CookieConsent";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import PageLoader from "./components/ui/PageLoader";
import PublicShell from "./components/ui/PublicShell";
import type { UserRole } from "./types";
import { pageTitle } from "./utils/pageTitle";

function ProtectedRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles?: UserRole[] }) {
  const { currentUser, userRole, accountStatus, loading, logout, refreshUserData } = useAuth();

  if (loading) {
    return <PageLoader label="Loading session…" />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Waiting for approval, or deactivated: say so plainly instead of showing a dashboard full of permission errors.
  if (accountStatus !== "active") {
    return (
      <PublicShell showAuthLinks={false}>
        <AccountNotice status={accountStatus} onCheckAgain={refreshUserData}
          onResend={async () => {
            if (auth.currentUser) await sendEmailVerification(auth.currentUser);
          }}
          onLogout={() => void logout()} />
      </PublicShell>
    );
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
  const page = useMotionPreset(pagePreset);

  useEffect(() => {
    document.title = pageTitle(location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-gray-950 text-white flex flex-col font-sans">
      <ErrorBoundary resetKey={location.pathname}>
        <Suspense fallback={<PageLoader />}>
          {/* mode="wait": the old page fades out (120ms) before the new one rises in, so two pages are never mounted at once.
              `location` is passed to Routes so the leaving page keeps rendering its own route while the URL has moved on. */}
          <AnimatePresence mode="wait">
            <m.div key={location.pathname} className="flex min-h-0 flex-1 flex-col" {...page}>
              <Routes location={location}>
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
            </m.div>
          </AnimatePresence>
        </Suspense>
      </ErrorBoundary>
      {/* After the page in the DOM: the skip link must be the first link a keyboard user reaches. It is fixed-position, so it still shows at the bottom. */}
      <CookieConsent />
    </div>
  );
}

import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import Login from "./components/Login.jsx";
import SurveyForm from "./components/SurveyForm.jsx";
import CounselorDashboard from "./components/CounselorDashboard.jsx";
import AppointmentScheduler from "./components/AppointmentScheduler.jsx";
import ManageAvailability from "./components/ManageAvailability.jsx";
import Appointments from "./components/Appointments.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import VerifyEmailNotice from "./components/VerifyEmailNotice.jsx";
import PendingApproval from "./components/PendingApproval.jsx";
import SessionBanner from "./components/SessionBanner.jsx";
import Verify from "./pages/Verify.jsx";
import icon from "./assets/mindbridge-icon.png";

const TABS_BY_ROLE = {
  student: [
    { id: "survey", label: "Check-in" },
    { id: "schedule", label: "Book Appointment" },
    { id: "appointments", label: "My Appointments" },
  ],
  counselor: [
    { id: "dashboard", label: "Dashboard" },
    { id: "availability", label: "Manage Availability" },
    { id: "appointments", label: "Appointments" },
  ],
  admin: [{ id: "admin", label: "Manage Users" }],
};

function AppContent() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  if (!user) {
    return <Login />;
  }

  if (!user.emailVerified) {
    return <VerifyEmailNotice />;
  }

  if (user.role === "counselor" && !user.approved) {
    return <PendingApproval />;
  }

  const tabs = TABS_BY_ROLE[user.role] || [];
  const activeTab = tab || tabs[0]?.id;

  return (
    <div className="min-h-screen bg-mist animate-fade-up">
      <SessionBanner />
      <header className="bg-ink border-b border-white/10 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
        <div className="max-w-6xl mx-auto px-3 py-3 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <img src={icon} alt="" className="h-7 w-7" />
                <span className="font-display text-white text-base tracking-tight">
                  Mind Bridge
                </span>
              </div>

              <div className="flex items-center gap-2 text-white/80 lg:hidden">
                <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-white/15 text-white/60">
                  {user.role}
                </span>
                <button
                  onClick={() => logout()}
                  className="text-xs text-white/60 hover:text-white transition"
                >
                  Log out
                </button>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-1.5 lg:justify-end">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); setLastResult(null); }}
                  className={`tab-button text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 rounded-full transition ${
                    activeTab === t.id && !lastResult
                     ? "bg-teal text-ink font-semibold shadow-sm"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  }`}
                >                  {t.label}
                </button>
              ))}

              <div className="hidden items-center gap-2.5 ml-2 pl-2 border-l border-white/10 lg:flex">
                <span className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-white/15 text-white/60">
                  {user.role}
                </span>
                <span className="text-sm text-white/80">{user.name}</span>
                <button
                  onClick={() => logout()}
                  className="text-sm text-white/50 hover:text-white transition"
                >
                  Log out
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {user.role === "student" && activeTab === "survey" && !lastResult && (
        <SurveyForm onSubmitted={(result) => setLastResult(result)} />
      )}

      {user.role === "student" && lastResult && (
        <div className="max-w-md mx-auto py-16 px-6 text-center">
          <h1 className="font-display text-2xl mb-2">Thanks for checking in</h1>
          <p className="text-ink/60 mb-6">
            Your response has been recorded confidentially.
            {lastResult.riskLevel !== "low" &&
              " Based on your answers, a counselor may reach out — or you can book a session yourself."}
          </p>
          <button
            onClick={() => { setTab("schedule"); setLastResult(null); }}
            className="bg-teal text-ink font-semibold rounded-lg px-5 py-2.5"
          >
            Book a session
          </button>
        </div>
      )}

      {user.role === "student" && activeTab === "schedule" && !lastResult && (
        <AppointmentScheduler onBooked={() => setTab("appointments")} />
      )}
      {user.role === "student" && activeTab === "appointments" && !lastResult && <Appointments />}

      {user.role === "counselor" && activeTab === "dashboard" && <CounselorDashboard />}
      {user.role === "counselor" && activeTab === "availability" && <ManageAvailability />}
      {user.role === "counselor" && activeTab === "appointments" && <Appointments />}

      {user.role === "admin" && activeTab === "admin" && <AdminPanel />}
    </div>
  );
}

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-ink/50">Loading…</div>;
  }

  return (
    <Routes>
      <Route path="/verify" element={<Verify />} />
      <Route path="*" element={<AppContent />} />
    </Routes>
  );
}

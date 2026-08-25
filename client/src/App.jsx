import { useState } from "react";
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
  admin: [{ id: "admin", label: "Manage Counselors" }],
};

export default function App() {
  const { user, loading, logout } = useAuth();
  const [tab, setTab] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-ink/50">Loading…</div>;
  }

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
    <div className="min-h-screen bg-mist">
      <SessionBanner />
      <header className="bg-ink border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <img src={icon} alt="" className="h-7 w-7" />
            <span className="font-display text-white text-base tracking-tight">
              Mind Bridge
            </span>
          </div>

          <nav className="flex items-center gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setLastResult(null); }}
                className={`text-sm px-3 py-1.5 rounded-full transition ${
                  activeTab === t.id && !lastResult
                    ? "bg-teal text-ink font-semibold"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}

            <div className="flex items-center gap-2.5 ml-3 pl-3 border-l border-white/10">
              <span className="hidden sm:inline text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-white/15 text-white/60">
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

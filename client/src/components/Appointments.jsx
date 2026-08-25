import { useEffect, useState } from "react";
import { getAppointments } from "../api";
import { useAuth } from "../AuthContext.jsx";

export default function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAppointments()
      .then(setAppointments)
      .finally(() => setLoading(false));
  }, []);

  const isStudent = user.role === "student";

  return (
    <div className="max-w-3xl mx-auto px-3 py-8 sm:px-6 sm:py-12">
      <p className="text-teal font-semibold tracking-[0.2em] text-[10px] sm:text-xs mb-2">
        {isStudent ? "YOUR SESSIONS" : "YOUR CASELOAD"}
      </p>
      <h1 className="font-display text-2xl sm:text-3xl text-ink mb-6">My appointments</h1>

      {loading && <p className="text-ink/50 text-sm">Loading…</p>}

      {!loading && appointments.length === 0 && (
        <p className="text-ink/50 text-sm">
          {isStudent
            ? "No appointments booked yet — head to Book Appointment to find a time."
            : "No students have booked a session with you yet."}
        </p>
      )}

      <div className="space-y-3">
        {appointments.map((a) => (
          <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm border border-ink/10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-ink">{isStudent ? `With ${a.counselorName}` : a.studentName}</p>
              <p className="text-sm text-ink/50">
                {new Date(a.start).toLocaleString()} to {new Date(a.end).toLocaleString()}
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200 px-2 py-0.5 text-[11px] font-medium capitalize">
              {a.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

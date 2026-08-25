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
    <div className="max-w-2xl mx-auto py-12 px-6">
      <p className="text-teal font-semibold tracking-widest text-xs mb-2">
        {isStudent ? "YOUR SESSIONS" : "YOUR CASELOAD"}
      </p>
      <h1 className="font-display text-3xl text-ink mb-6">My appointments</h1>

      {loading && <p className="text-ink/50 text-sm">Loading…</p>}

      {!loading && appointments.length === 0 && (
        <p className="text-ink/50 text-sm">
          {isStudent
            ? "No appointments booked yet — head to Book Appointment to find a time."
            : "No students have booked a session with you yet."}
        </p>
      )}

      <div className="space-y-2">
        {appointments.map((a) => (
          <div
            key={a.id}
            className="bg-white rounded-xl p-5 shadow-sm border border-ink/5 flex items-center justify-between"
          >
            <div>
              <p className="font-medium">
                {isStudent ? `With ${a.counselorName}` : a.studentName}
              </p>
              <p className="text-sm text-ink/50">{a.slot}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200 capitalize">
              {a.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

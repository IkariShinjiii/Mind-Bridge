import { useEffect, useMemo, useState } from "react";
import { getAppointments, updateAppointment } from "../api";
import { useAuth } from "../AuthContext.jsx";
import Spinner from "./Spinner";

const STATUS_META = {
  pending: {
    label: "Pending",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    dotClass: "bg-amber-500",
  },
  confirmed: {
    label: "Confirmed",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotClass: "bg-emerald-500",
  },
  completed: {
    label: "Completed",
    className: "border-sky-200 bg-sky-50 text-sky-700",
    dotClass: "bg-sky-500",
  },
};

function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${meta.className}`}>
      <span className={`h-2 w-2 rounded-full ${meta.dotClass}`} />
      {meta.label}
    </span>
  );
}

function SessionNotesCard({ notes, updatedAt }) {
  const noteText = notes && notes.trim() ? notes : "No post-session notes have been shared yet.";

  return (
    <div className="rounded-2xl border border-ink/10 bg-slate-50 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/55">Session notes</p>
        {updatedAt && <span className="text-[10px] text-ink/50">{new Date(updatedAt).toLocaleString()}</span>}
      </div>
      <p className="text-sm leading-6 text-ink/75">{noteText}</p>
    </div>
  );
}

export default function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const isStudent = user?.role === "student";

  async function loadAppointments() {
    try {
      const data = await getAppointments();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (error) {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
    const intervalId = setInterval(loadAppointments, 15000);
    return () => clearInterval(intervalId);
  }, []);

  async function handleStatusChange(id, status) {
    if (!id || savingId === id) return;
    setSavingId(id);
    try {
      await updateAppointment(id, { status });
      await loadAppointments();
    } finally {
      setSavingId(null);
    }
  }

  const orderedAppointments = useMemo(
    () => [...appointments].sort((a, b) => new Date(a.start) - new Date(b.start)),
    [appointments]
  );

  return (
    <div className="mx-auto max-w-5xl px-3 py-8 sm:px-6 sm:py-12">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-teal sm:text-xs">
            {isStudent ? "Your appointments" : "Appointment tracker"}
          </p>
          <h1 className="font-display text-2xl text-ink sm:text-3xl">
            {isStudent ? "Counseling session tracker" : "Student session tracker"}
          </h1>
        </div>
        <div className="rounded-full border border-ink/10 bg-white px-3 py-1.5 text-xs text-ink/60 shadow-sm">
          {orderedAppointments.length} scheduled
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-ink/60">
            <Spinner size={16} className="text-ink/60" />
            <span>Loading your counseling history…</span>
          </div>
        </div>
      ) : orderedAppointments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-medium text-ink">No sessions booked yet.</p>
          <p className="mt-2 text-sm text-ink/55">
            {isStudent
              ? "Book an appointment to begin tracking your support plan."
              : "Students have not booked a session with you yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orderedAppointments.map((appointment, index) => {
            const start = new Date(appointment.start);
            const end = new Date(appointment.end);
            const status = appointment.status || "pending";
            const sessionNoteText = appointment.notes && appointment.notes.trim() ? appointment.notes : "";
            const isCounselorSide = !isStudent;

            return (
              <article
                key={appointment.id}
                className="stagger-item rounded-3xl border border-ink/10 bg-white p-4 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md sm:p-5"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={status} />
                      <span className="rounded-full border border-ink/10 bg-mist px-2.5 py-1 text-[11px] font-medium text-ink/60">
                        {isStudent ? `With ${appointment.counselorName || "Counselor"}` : appointment.studentName || "Student"}
                      </span>
                    </div>

                    <div>
                      <p className="font-medium text-ink sm:text-lg">
                        {start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                      <p className="text-sm text-ink/60">
                        {start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - {end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>

                  {isCounselorSide && (
                    <div className="flex flex-wrap gap-2">
                      {status !== "pending" && (
                        <button
                          onClick={() => handleStatusChange(appointment.id, "pending")}
                          disabled={savingId === appointment.id}
                          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Pending
                        </button>
                      )}
                      {status !== "confirmed" && (
                        <button
                          onClick={() => handleStatusChange(appointment.id, "confirmed")}
                          disabled={savingId === appointment.id}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Confirm
                        </button>
                      )}
                      {status !== "completed" && (
                        <button
                          onClick={() => handleStatusChange(appointment.id, "completed")}
                          disabled={savingId === appointment.id}
                          className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                  <div className="rounded-2xl border border-ink/10 bg-mist p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/55">Session summary</p>
                      {isStudent && status === "completed" && (
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                          Follow-up ready
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-6 text-ink/70">
                      {status === "pending" && "This appointment is waiting for counselor confirmation."}
                      {status === "confirmed" && "This session is confirmed and ready to proceed."}
                      {status === "completed" && "This counseling session was completed successfully."}
                    </p>
                  </div>

                  <SessionNotesCard notes={sessionNoteText} updatedAt={appointment.notesUpdatedAt || appointment.completedAt} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

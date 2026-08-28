import { useEffect, useMemo, useState } from "react";
import { getAssessments, updateAssessmentStatus, getAllAppointments, updateAppointmentStatus, getUserSettings } from "../api";
import Spinner from "./Spinner";
import ManageAvailability from "./ManageAvailability";

const RISK_STYLES = {
  high: "bg-red-500/10 text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const STATUS_STYLES = {
  open: "bg-gray-800 text-gray-300 border-gray-700",
  reviewed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  escalated: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function CounselorDashboard() {
  const [cases, setCases] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState("flagged");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  // Inspector Modal State
  const [activeCase, setActiveCase] = useState(null);
  const [studentContact, setStudentContact] = useState(null);
  const [loadingContact, setLoadingContact] = useState(false);
  const [counselorNoteInput, setCounselorNoteInput] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  async function load() {
    try {
      const [assessmentData, appointmentData] = await Promise.all([
        getAssessments(),
        getAllAppointments().catch(() => [])
      ]);
      setCases(Array.isArray(assessmentData) ? assessmentData : []);
      setAppointments(Array.isArray(appointmentData) ? appointmentData : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markReviewed(id, nextStatus = "reviewed") {
    if (updatingId) return;
    setUpdatingId(id);
    try {
      await updateAssessmentStatus(id, nextStatus);
      await load();
      if (activeCase && activeCase.id === id) {
        setActiveCase((prev) => ({ ...prev, status: nextStatus }));
      }
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleApproveAppointment(id) {
    try {
      await updateAppointmentStatus(id, "Confirmed");
      load();
    } catch (err) {
      console.error("Failed to approve appointment", err);
    }
  }

  async function openCaseInspector(item) {
    setActiveCase(item);
    setCounselorNoteInput(item.counselorNotes || "");
    setStudentContact(null);
    if (item.studentId && item.studentId !== "anonymous") {
      setLoadingContact(true);
      try {
        const studentDoc = await getUserSettings(item.studentId);
        setStudentContact(studentDoc);
      } catch (err) {
        console.warn("Could not load student contact info", err);
      } finally {
        setLoadingContact(false);
      }
    }
  }

  async function handleSaveNotes() {
    if (!activeCase) return;
    setSavingNotes(true);
    try {
      await updateAssessmentStatus(activeCase.id, activeCase.status || "open", counselorNoteInput);
      setActiveCase((prev) => ({ ...prev, counselorNotes: counselorNoteInput }));
      await load();
    } catch (err) {
      console.error("Error saving counselor notes", err);
    } finally {
      setSavingNotes(false);
    }
  }

  const visible = useMemo(() => {
    return cases.filter((item) => {
      const risk = item.riskLevel || "low";
      const isFlagged = item.flaggedForImmediateReview || risk === "high";

      if (filter === "flagged") return isFlagged;
      if (filter === "open") return (item.status || "open") === "open";
      if (filter === "reviewed") return (item.status || "open") === "reviewed";
      if (filter === "escalated") return (item.status || "open") === "escalated";
      if (filter === "high") return risk === "high";
      if (filter === "medium") return risk === "medium";
      return true;
    });
  }, [cases, filter]);

  return (
    <div className="mx-auto max-w-7xl px-3 py-8 animate-fade-up sm:px-6 sm:py-12 space-y-12">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400 sm:text-xs">COUNSELOR CONTROL CENTER</p>
        <h1 className="mb-6 font-display text-2xl text-white sm:text-3xl">Counselor Dashboard</h1>

        {/* Manage Availability Component */}
        <div className="mb-10">
          <ManageAvailability />
        </div>

        {/* Incoming Student Appointments Queue */}
        <div className="mb-10 rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span>📅</span>
            <span>Student Appointment Requests</span>
          </h2>
          {appointments.length === 0 ? (
            <p className="text-sm text-gray-500">No student appointment requests yet.</p>
          ) : (
            <div className="space-y-3">
              {appointments.map((apt) => (
                <div key={apt.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl border border-gray-800 bg-gray-800/40 p-4 gap-3">
                  <div>
                    <div className="font-medium text-white">{apt.studentName || "Student"} - {apt.title}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Student: <span className="text-gray-300">{apt.studentEmail || "Institutional email"}</span> • Time:{" "}
                      <span className="text-cyan-300">
                        {apt.start ? new Date(apt.start).toLocaleString() : (apt.date ? new Date(apt.date).toLocaleString() : "Pending time")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium border ${
                      apt.status === "Confirmed"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}>
                      {apt.status || "Pending Review"}
                    </span>
                    {apt.status !== "Confirmed" && (
                      <button
                        onClick={() => handleApproveAppointment(apt.id)}
                        className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 transition-colors shadow-sm"
                      >
                        Approve Appointment
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assessment Cases Section */}
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <span>📋</span>
          <span>Student Assessment Cases & Risk Triage</span>
        </h2>
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            ["flagged", "🚨 Flagged / Urgent"],
            ["open", "Open"],
            ["reviewed", "Reviewed"],
            ["escalated", "Escalated"],
            ["high", "High risk"],
            ["medium", "Medium risk"],
            ["all", "All Cases"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`action-button rounded-full border px-3.5 py-1.5 text-xs transition-all duration-200 sm:text-sm font-medium ${
                filter === value ? "border-cyan-500 bg-cyan-600 text-white shadow-sm" : "border-gray-700 text-gray-400 hover:border-gray-500 hover:bg-gray-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-8">
            <Spinner /> Loading student assessment records…
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-800 p-8 text-center text-sm text-gray-500">
            No student cases in this view category.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-gray-900 shadow-sm">
            <table className="min-w-[750px] w-full text-left text-sm">
              <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Risk Classification</th>
                  <th className="px-4 py-3 font-semibold">Score</th>
                  <th className="px-4 py-3 font-semibold">Case Status</th>
                  <th className="px-4 py-3 font-semibold">Submitted</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => {
                  const risk = item.riskLevel || "low";
                  const status = item.status || "open";
                  const submittedAt = item.submittedAt
                    ? new Date(item.submittedAt).toLocaleString()
                    : item.createdAt
                      ? new Date(item.createdAt).toLocaleString()
                      : "Unknown";

                  return (
                    <tr key={item.id} className="border-t border-gray-800 align-middle hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-white">{item.studentName || "Student"}</div>
                        <div className="text-xs text-gray-400">{item.studentEmail || item.email || "No email provided"}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${RISK_STYLES[risk]}`}>
                            {risk} Risk
                          </span>
                          {item.flaggedForImmediateReview && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-red-500 bg-red-600/90 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider animate-pulse">
                              <span>⚠️</span> Immediate
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-300 font-mono text-xs">
                        {item.total ?? 0} / {item.maxScore ?? 21}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[status] || "bg-gray-800 text-gray-300 border-gray-700"}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-400">{submittedAt}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openCaseInspector(item)}
                            className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:border-cyan-500 hover:text-white transition"
                          >
                            Inspect Case
                          </button>
                          {status !== "reviewed" ? (
                            <button
                              onClick={() => markReviewed(item.id, "reviewed")}
                              disabled={updatingId === item.id}
                              className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 transition disabled:opacity-60"
                            >
                              {updatingId === item.id ? "Updating…" : "Mark Reviewed"}
                            </button>
                          ) : (
                            <button
                              onClick={() => markReviewed(item.id, "open")}
                              disabled={updatingId === item.id}
                              className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-400 hover:border-gray-500 hover:text-white transition disabled:opacity-60"
                            >
                              {updatingId === item.id ? "Updating…" : "Re-open"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CASE INSPECTOR MODAL */}
      {activeCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-up">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-800 bg-gray-900 p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-800 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white">{activeCase.studentName || "Student Assessment Details"}</h3>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${RISK_STYLES[activeCase.riskLevel || "low"]}`}>
                    {activeCase.riskLevel} Risk
                  </span>
                  {activeCase.flaggedForImmediateReview && (
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                      Immediate Concern
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Email: <span className="text-cyan-300 font-mono">{activeCase.studentEmail}</span> • Submitted: {new Date(activeCase.createdAt || activeCase.submittedAt || Date.now()).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setActiveCase(null)}
                className="text-gray-400 hover:text-white text-xl p-1"
              >
                ✕
              </button>
            </div>

            {/* Questions Breakdown */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-3">
                Screening Responses Breakdown (PHQ / GAD Scale)
              </h4>
              {Array.isArray(activeCase.questionSummary) && activeCase.questionSummary.length > 0 ? (
                <div className="space-y-2">
                  {activeCase.questionSummary.map((q, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                        q.isCrisisItem && Number(q.score) > 0
                          ? "border-red-500 bg-red-950/40 text-red-200 font-medium"
                          : "border-gray-800 bg-gray-950/60 text-gray-300"
                      }`}
                    >
                      <div className="flex-1">
                        <span className="font-semibold text-white mr-1.5">{idx + 1}.</span>
                        {q.text}
                        {q.isCrisisItem && (
                          <span className="ml-2 text-[10px] uppercase font-bold text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded">
                            Crisis Item
                          </span>
                        )}
                      </div>
                      <div className="shrink-0 font-bold text-sm px-2.5 py-1 rounded bg-gray-800 text-cyan-300 font-mono">
                        Score: {q.score ?? "—"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Total Score: {activeCase.total} / {activeCase.maxScore || 21}</p>
              )}
            </div>

            {/* Emergency Contact Information (From Student Profile) */}
            <div className="mb-6 rounded-xl border border-gray-800 bg-gray-950/70 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Emergency Contact Record
              </h4>
              {loadingContact ? (
                <div className="text-xs text-gray-500 flex items-center gap-2"><Spinner size={12} /> Loading profile contact...</div>
              ) : studentContact?.emergencyContact?.name ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-300">
                  <div>Name: <span className="font-semibold text-white">{studentContact.emergencyContact.name}</span></div>
                  <div>Relationship: <span className="font-semibold text-white">{studentContact.emergencyContact.relationship}</span></div>
                  <div>Primary Phone: <span className="font-semibold text-cyan-300 font-mono">{studentContact.emergencyContact.phone}</span></div>
                  {studentContact.emergencyContact.alternatePhone && (
                    <div>Alternate Phone: <span className="font-semibold text-gray-300 font-mono">{studentContact.emergencyContact.alternatePhone}</span></div>
                  )}
                  {studentContact.emergencyContact.notes && (
                    <div className="col-span-2 text-gray-400 italic">Notes: {studentContact.emergencyContact.notes}</div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500">Student has not designated an emergency contact in profile settings.</p>
              )}
            </div>

            {/* Counselor Case Notes & Status Update */}
            <div className="mb-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
                Confidential Counselor Case Notes & Status
              </h4>
              <textarea
                rows={3}
                value={counselorNoteInput}
                onChange={(e) => setCounselorNoteInput(e.target.value)}
                placeholder="Document case assessment, outreach actions, or scheduled guidance sessions..."
                className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
              />
              <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Set Case Status:</span>
                  {["open", "reviewed", "escalated"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => markReviewed(activeCase.id, st)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                        activeCase.status === st
                          ? "bg-cyan-600 text-white"
                          : "border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 transition disabled:opacity-50"
                >
                  {savingNotes ? "Saving Notes…" : "Save Case Notes"}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-4 border-t border-gray-800">
              <button
                onClick={() => setActiveCase(null)}
                className="rounded-xl border border-gray-700 px-5 py-2 text-xs font-medium text-gray-300 hover:bg-gray-800 transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
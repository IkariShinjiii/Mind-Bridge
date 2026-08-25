import { useEffect, useMemo, useState } from "react";
import { getAssessments, updateAssessmentStatus } from "../api";
import Spinner from "./Spinner";

const RISK_STYLES = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const STATUS_STYLES = {
  open: "bg-slate-100 text-slate-700 border-slate-200",
  reviewed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  escalated: "bg-red-100 text-red-700 border-red-200",
};

export default function CounselorDashboard() {
  const [cases, setCases] = useState([]);
  const [filter, setFilter] = useState("flagged");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  async function load() {
    try {
      const data = await getAssessments();
      setCases(Array.isArray(data) ? data : []);
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
      load();
    } finally {
      setUpdatingId(null);
    }
  }

  const visible = useMemo(() => {
    return cases.filter((item) => {
      const risk = item.riskLevel || "low";
      const isFlagged = item.flaggedForImmediateReview || risk === "high";

      if (filter === "flagged") return isFlagged;
      if (filter === "open") return (item.status || "open") === "open";
      if (filter === "reviewed") return (item.status || "open") === "reviewed";
      if (filter === "high") return risk === "high";
      if (filter === "medium") return risk === "medium";
      return true;
    });
  }, [cases, filter]);

  return (
    <div className="max-w-7xl mx-auto px-3 py-8 sm:px-6 sm:py-12">
      <p className="text-teal font-semibold tracking-[0.2em] text-[10px] sm:text-xs mb-2">COUNSELOR VIEW</p>
      <h1 className="font-display text-2xl sm:text-3xl text-ink mb-6">Student assessment cases</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          ["flagged", "Flagged"],
          ["open", "Open"],
          ["reviewed", "Reviewed"],
          ["high", "High risk"],
          ["medium", "Medium risk"],
          ["all", "All"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`text-xs sm:text-sm px-3 py-1.5 rounded-full border transition ${
              filter === value ? "bg-ink text-white border-ink" : "border-ink/15 text-ink/70 hover:border-ink/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-ink/60">Loading cases…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-ink/50">No student cases in this view yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-white shadow-sm">
          <table className="min-w-[700px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-ink/70">
              <tr>
                <th className="px-3 py-3 font-semibold sm:px-4">Student</th>
                <th className="px-3 py-3 font-semibold sm:px-4">Risk</th>
                <th className="px-3 py-3 font-semibold sm:px-4">Score</th>
                <th className="px-3 py-3 font-semibold sm:px-4">Status</th>
                <th className="px-3 py-3 font-semibold sm:px-4">Submitted</th>
                <th className="px-3 py-3 font-semibold sm:px-4">Action</th>
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
                  <tr key={item.id} className="border-t border-ink/10 align-top">
                    <td className="px-3 py-3 sm:px-4">
                      <div className="font-medium text-ink">{item.studentName || "Unknown"}</div>
                      <div className="text-xs text-ink/50">{item.studentEmail || item.email || "No email"}</div>
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${RISK_STYLES[risk]}`}>
                          {risk}
                        </span>
                        {item.flaggedForImmediateReview && (
                          <span className="inline-flex rounded-full border border-red-600 bg-red-600 px-2 py-1 text-[10px] font-medium text-white">
                            Immediate
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-ink/80 sm:px-4">
                      {item.total ?? 0}/{item.maxScore ?? 27}
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${STATUS_STYLES[status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-ink/70 sm:px-4">{submittedAt}</td>
                    <td className="px-3 py-3 sm:px-4">
                      {status !== "reviewed" ? (
                        <button
                          onClick={() => markReviewed(item.id, "reviewed")}
                          disabled={updatingId === item.id}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white transition duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                          {updatingId === item.id ? (
                            <>
                              <Spinner size={14} color="#ffffff" className="text-white" />
                              <span>Updating…</span>
                            </>
                          ) : (
                            "Mark reviewed"
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => markReviewed(item.id, "open")}
                          disabled={updatingId === item.id}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-ink/15 px-3 py-2 text-sm font-medium text-ink/80 transition duration-200 hover:border-ink/40 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                          {updatingId === item.id ? (
                            <>
                              <Spinner size={14} className="text-ink/80" />
                              <span>Updating…</span>
                            </>
                          ) : (
                            "Re-open"
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

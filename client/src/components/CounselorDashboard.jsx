import { useEffect, useMemo, useState } from "react";
import { getAssessments, updateAssessmentStatus } from "../api";
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
    <div className="mx-auto max-w-7xl px-3 py-8 animate-fade-up sm:px-6 sm:py-12 space-y-8">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400 sm:text-xs">COUNSELOR VIEW</p>
        <h1 className="mb-6 font-display text-2xl text-white sm:text-3xl">Student assessment cases</h1>

        {/* Manage Availability Component Integrated Here */}
        <div className="mb-8">
          <ManageAvailability />
        </div>

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
              className={`action-button rounded-full border px-3 py-1.5 text-xs transition-all duration-200 sm:text-sm ${
                filter === value ? "border-cyan-500 bg-cyan-600 text-white shadow-sm" : "border-gray-700 text-gray-400 hover:border-gray-500 hover:bg-gray-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading cases…</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-gray-500">No student cases in this view yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-gray-900 shadow-sm">
            <table className="min-w-[700px] w-full text-left text-sm">
              <thead className="bg-gray-800/50 text-gray-400">
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
                    <tr key={item.id} className="border-t border-gray-800 align-top">
                      <td className="px-3 py-3 sm:px-4">
                        <div className="font-medium text-white">{item.studentName || "Unknown"}</div>
                        <div className="text-xs text-gray-500">{item.studentEmail || item.email || "No email"}</div>
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${RISK_STYLES[risk]}`}>
                            {risk}
                          </span>
                          {item.flaggedForImmediateReview && (
                            <span className="inline-flex rounded-full border border-red-500 bg-red-600 px-2 py-1 text-[10px] font-medium text-white">
                              Immediate
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-gray-300 sm:px-4">
                        {item.total ?? 0}/{item.maxScore ?? 27}
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${STATUS_STYLES[status] || "bg-gray-800 text-gray-300 border-gray-700"}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-400 sm:px-4">{submittedAt}</td>
                      <td className="px-3 py-3 sm:px-4">
                        {status !== "reviewed" ? (
                          <button
                            onClick={() => markReviewed(item.id, "reviewed")}
                            disabled={updatingId === item.id}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-sm font-medium text-gray-300 transition duration-200 hover:border-gray-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                          >
                            {updatingId === item.id ? (
                              <>
                                <Spinner size={14} className="text-gray-400" />
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
    </div>
  );
}
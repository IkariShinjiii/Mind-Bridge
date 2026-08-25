import { useEffect, useMemo, useState } from "react";
import { getAssessments, updateAssessmentStatus } from "../api";

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
    await updateAssessmentStatus(id, nextStatus);
    load();
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
    <div className="max-w-6xl mx-auto py-12 px-6">
      <p className="text-teal font-semibold tracking-widest text-xs mb-2">COUNSELOR VIEW</p>
      <h1 className="font-display text-3xl text-ink mb-6">Student assessment cases</h1>

      <div className="flex flex-wrap gap-2 mb-6">
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
            className={`text-sm px-3 py-1.5 rounded-full border ${
              filter === value ? "bg-ink text-white border-ink" : "border-ink/15 text-ink/70 hover:border-ink/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-ink/60">Loading cases…</p>
      ) : visible.length === 0 ? (
        <p className="text-ink/50 text-sm">No student cases in this view yet.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-2xl border border-ink/10 shadow-sm">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50 text-sm text-ink/70">
              <tr>
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Risk</th>
                <th className="px-4 py-3 font-semibold">Score</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Submitted</th>
                <th className="px-4 py-3 font-semibold">Action</th>
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
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{item.studentName || "Unknown"}</div>
                      <div className="text-xs text-ink/50">{item.studentEmail || item.email || "No email"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${RISK_STYLES[risk]}`}>
                        {risk}
                      </span>
                      {item.flaggedForImmediateReview && (
                        <span className="mt-2 inline-flex rounded-full border border-red-600 bg-red-600 text-white px-2 py-1 text-[10px] ml-2">
                          Immediate
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink/80">
                      {item.total ?? 0}/{item.maxScore ?? 27}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${STATUS_STYLES[status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink/70">{submittedAt}</td>
                    <td className="px-4 py-3">
                      {status !== "reviewed" ? (
                        <button
                          onClick={() => markReviewed(item.id, "reviewed")}
                          className="bg-ink text-white text-sm rounded-lg px-3 py-2 hover:brightness-110"
                        >
                          Mark reviewed
                        </button>
                      ) : (
                        <button
                          onClick={() => markReviewed(item.id, "open")}
                          className="border border-ink/15 text-ink/80 text-sm rounded-lg px-3 py-2 hover:border-ink/40"
                        >
                          Re-open
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

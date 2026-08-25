import { useEffect, useState } from "react";
import { getResponses, updateResponseStatus } from "../api";

const RISK_STYLES = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export default function CounselorDashboard() {
  const [responses, setResponses] = useState([]);
  const [filter, setFilter] = useState("all");

  async function load() {
    const data = await getResponses();
    setResponses(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function markReviewed(id) {
    await updateResponseStatus(id, "reviewed");
    load();
  }

  const visible = responses.filter((r) => {
    if (filter === "all") return true;
    if (filter === "flagged") return r.flaggedForImmediateReview || r.riskLevel === "high";
    return r.status === filter;
  });

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <p className="text-teal font-semibold tracking-widest text-xs mb-2">
        COUNSELOR VIEW
      </p>
      <h1 className="font-display text-3xl text-ink mb-6">Flagged check-ins</h1>

      <div className="flex gap-2 mb-6">
        {["all", "flagged", "open", "reviewed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-sm px-3 py-1.5 rounded-full border ${
              filter === f
                ? "bg-ink text-white border-ink"
                : "border-ink/15 text-ink/70 hover:border-ink/40"
            }`}
          >
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="text-ink/50 text-sm">No check-ins in this view yet.</p>
      )}

      <div className="space-y-3">
        {visible.map((r) => (
          <div
            key={r.id}
            className="bg-white rounded-xl p-5 shadow-sm border border-ink/5 flex items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">{r.studentName}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${RISK_STYLES[r.riskLevel]}`}
                >
                  {r.riskLevel} risk
                </span>
                {r.flaggedForImmediateReview && (
                  <span className="text-xs px-2 py-0.5 rounded-full border bg-red-600 text-white border-red-600">
                    Immediate review
                  </span>
                )}
              </div>
              <p className="text-sm text-ink/60">
                Score {r.total}/{r.maxScore} · Submitted{" "}
                {new Date(r.submittedAt).toLocaleString()} · Status: {r.status}
              </p>
            </div>
            {r.status === "open" && (
              <button
                onClick={() => markReviewed(r.id)}
                className="text-sm bg-ink text-white rounded-lg px-4 py-2 whitespace-nowrap hover:brightness-110"
              >
                Mark reviewed
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

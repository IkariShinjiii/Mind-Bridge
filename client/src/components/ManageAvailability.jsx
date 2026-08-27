import { useEffect, useState } from "react";
import { getMyAvailability, addAvailability, removeAvailability } from "../api";
import Spinner from "./Spinner";

function safeFormatDate(val) {
  if (!val) return null;
  // If it's already a formatted string or time, return it directly
  if (typeof val === "string" && !val.includes("-") && !val.includes("/")) return val;
  const date = new Date(val);
  return Number.isNaN(date.getTime()) ? val : date.toLocaleString();
}

export default function ManageAvailability() {
  const [slots, setSlots] = useState([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");
  const [savingSlot, setSavingSlot] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  async function load() {
    const data = await getMyAvailability();
    setSlots(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!start || !end || savingSlot) {
      setError("Please choose both a start and end time.");
      return;
    }

    setSavingSlot(true);
    try {
      await addAvailability(start, end);
      setStart("");
      setEnd("");
      setError("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingSlot(false);
    }
  }

  async function handleRemove(id) {
    if (removingId) return;
    setRemovingId(id);
    try {
      await removeAvailability(id);
      load();
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-3 py-8 animate-fade-up sm:px-6 sm:py-12">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400 sm:text-xs">COUNSELOR VIEW</p>
      <h1 className="mb-6 font-display text-2xl text-white sm:text-3xl">Manage availability</h1>

      <form onSubmit={handleAdd} className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-sm transition-all duration-200 hover:border-gray-700 sm:p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Start</label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">End</label>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={savingSlot}
              className="action-button inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingSlot ? (
                <>
                  <Spinner size={14} color="#ffffff" className="text-white" />
                  <span>Adding…</span>
                </>
              ) : (
                "Add slot"
              )}
            </button>
          </div>
        </div>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      </form>

      {slots.length === 0 && (
        <p className="text-gray-500 text-sm">You haven't added any open slots yet.</p>
      )}

      <div className="space-y-3">
        {slots.map((s) => {
          // Fallback checks for different property names saved in Firestore
          const startTime = safeFormatDate(s.start || s.date || s.time);
          const endTime = safeFormatDate(s.end || s.to);

          return (
            <div key={s.id} className="rounded-xl border border-gray-800 bg-gray-900 flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
              <div>
                <div className="font-medium text-white">{startTime}</div>
                {endTime && <div className="text-sm text-gray-400">to {endTime}</div>}
              </div>
              <button
                onClick={() => handleRemove(s.id)}
                disabled={removingId === s.id}
                className="inline-flex items-center justify-center gap-2 text-sm text-red-400 transition hover:text-red-300 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {removingId === s.id ? (
                  <>
                    <Spinner size={14} color="#ef4444" className="text-red-400" />
                    <span>Removing…</span>
                  </>
                ) : (
                  "Remove"
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { getMyAvailability, addAvailability, removeAvailability } from "../api";
import Spinner from "./Spinner";

export default function ManageAvailability() {
  const [slots, setSlots] = useState([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");
  const [savingSlot, setSavingSlot] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  async function load() {
    setSlots(await getMyAvailability());
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
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-teal sm:text-xs">COUNSELOR VIEW</p>
      <h1 className="mb-6 font-display text-2xl text-ink sm:text-3xl">Manage availability</h1>

      <form onSubmit={handleAdd} className="mb-8 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md sm:p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium mb-1">Start</label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full rounded-lg border border-ink/15 px-3 py-2.5 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End</label>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full rounded-lg border border-ink/15 px-3 py-2.5 text-sm"
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={savingSlot}
              className="action-button inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
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
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
      </form>

      {slots.length === 0 && (
        <p className="text-ink/50 text-sm">You haven't added any open slots yet.</p>
      )}

      <div className="space-y-3">
        {slots.map((s) => (
          <div key={s.id} className="card-surface flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-medium text-ink">{new Date(s.start).toLocaleString()}</div>
              <div className="text-sm text-ink/60">to {new Date(s.end).toLocaleString()}</div>
            </div>
            <button
              onClick={() => handleRemove(s.id)}
              disabled={removingId === s.id}
              className="inline-flex items-center justify-center gap-2 text-sm text-red-600 transition hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              {removingId === s.id ? (
                <>
                  <Spinner size={14} color="#dc2626" className="text-red-600" />
                  <span>Removing…</span>
                </>
              ) : (
                "Remove"
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

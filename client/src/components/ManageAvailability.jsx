import { useEffect, useState } from "react";
import { getMyAvailability, addAvailability, removeAvailability } from "../api";

export default function ManageAvailability() {
  const [slots, setSlots] = useState([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setSlots(await getMyAvailability());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!start || !end) {
      setError("Please choose both a start and end time.");
      return;
    }
    try {
      await addAvailability(start, end);
      setStart("");
      setEnd("");
      setError("");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemove(id) {
    await removeAvailability(id);
    load();
  }

  return (
    <div className="max-w-4xl mx-auto px-3 py-8 sm:px-6 sm:py-12">
      <p className="text-teal font-semibold tracking-[0.2em] text-[10px] sm:text-xs mb-2">COUNSELOR VIEW</p>
      <h1 className="font-display text-2xl sm:text-3xl text-ink mb-6">Manage availability</h1>

      <form onSubmit={handleAdd} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-ink/10 mb-8">
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
            <button type="submit" className="w-full bg-ink text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:brightness-110">
              Add slot
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
          <div key={s.id} className="bg-white rounded-xl px-4 py-4 shadow-sm border border-ink/10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-medium text-ink">{new Date(s.start).toLocaleString()}</div>
              <div className="text-sm text-ink/60">to {new Date(s.end).toLocaleString()}</div>
            </div>
            <button onClick={() => handleRemove(s.id)} className="text-sm text-red-600 hover:underline">
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

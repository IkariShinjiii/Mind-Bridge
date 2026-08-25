import { useEffect, useState } from "react";
import { getMyAvailability, addAvailability, removeAvailability } from "../api";

export default function ManageAvailability() {
  const [slots, setSlots] = useState([]);
  const [newSlot, setNewSlot] = useState("");

  async function load() {
    setSlots(await getMyAvailability());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newSlot.trim()) return;
    await addAvailability(newSlot.trim());
    setNewSlot("");
    load();
  }

  async function handleRemove(id) {
    await removeAvailability(id);
    load();
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <p className="text-teal font-semibold tracking-widest text-xs mb-2">
        COUNSELOR VIEW
      </p>
      <h1 className="font-display text-3xl text-ink mb-6">Manage availability</h1>

      <form onSubmit={handleAdd} className="flex gap-2 mb-8">
        <input
          type="text"
          value={newSlot}
          onChange={(e) => setNewSlot(e.target.value)}
          placeholder="e.g. Mon 10:00 AM"
          className="flex-1 rounded-lg border border-ink/15 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal"
        />
        <button
          type="submit"
          className="bg-ink text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:brightness-110"
        >
          Add slot
        </button>
      </form>

      {slots.length === 0 && (
        <p className="text-ink/50 text-sm">
          You haven't added any open slots yet. Add one above so students can
          book you.
        </p>
      )}

      <div className="space-y-2">
        {slots.map((s) => (
          <div
            key={s.id}
            className="bg-white rounded-xl px-5 py-3 shadow-sm border border-ink/5 flex items-center justify-between"
          >
            <div>
              <span className="font-medium">{s.slot}</span>
              <span
                className={`ml-3 text-xs px-2 py-0.5 rounded-full border ${
                  s.booked
                    ? "bg-ink/5 text-ink/50 border-ink/10"
                    : "bg-emerald-100 text-emerald-700 border-emerald-200"
                }`}
              >
                {s.booked ? "Booked" : "Open"}
              </span>
            </div>
            {!s.booked && (
              <button
                onClick={() => handleRemove(s.id)}
                className="text-sm text-red-600 hover:underline"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

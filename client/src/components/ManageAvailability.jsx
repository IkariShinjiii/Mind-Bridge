import React, { useEffect, useState } from "react";
import { getMyAvailability, addAvailability, removeAvailability } from "../api";
import Spinner from "./Spinner";

function safeFormatDate(val) {
  if (!val) return null;
  if (typeof val === "string" && !val.includes("-") && !val.includes("/")) return val;
  const date = new Date(val);
  return Number.isNaN(date.getTime()) ? val : date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
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
    <div className="space-y-6">
      {/* Add Slot Card */}
      <form
        onSubmit={handleAdd}
        className="rounded-2xl border border-gray-800 bg-gray-900/90 p-5 shadow-sm"
      >
        <div className="mb-4">
          <h3 className="text-base font-semibold text-white">Add Open Counseling Slot</h3>
          <p className="text-xs text-gray-400">
            Publish time slots for students to book confidential on-campus sessions.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-300">
              Start Date & Time
            </label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-300">
              End Date & Time
            </label>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              required
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={savingSlot}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-cyan-500 disabled:opacity-50"
            >
              {savingSlot ? <Spinner size={14} /> : "Publish Slot"}
            </button>
          </div>
        </div>

        {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
      </form>

      {/* Published Slots List */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/90 p-5 shadow-sm">
        <h3 className="text-base font-semibold text-white mb-3 flex items-center justify-between">
          <span>Active Availability Slots</span>
          <span className="text-xs text-gray-400 font-normal">{slots.length} total slots</span>
        </h3>

        {slots.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-800 p-6 text-center text-xs text-gray-500">
            No active availability slots published yet. Add a slot above to allow students to book.
          </div>
        ) : (
          <div className="space-y-2.5">
            {slots.map((s) => {
              const startTime = safeFormatDate(s.start || s.date || s.time);
              const endTime = safeFormatDate(s.end || s.to);

              return (
                <div
                  key={s.id}
                  className="rounded-xl border border-gray-800 bg-gray-950/60 flex flex-col gap-2 p-3.5 sm:flex-row sm:items-center sm:justify-between text-xs"
                >
                  <div>
                    <div className="font-medium text-white flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-cyan-400" />
                      <span>{startTime}</span>
                      {endTime && <span className="text-gray-400">to {endTime}</span>}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5 ml-4">
                      Status:{" "}
                      <span className={s.isBooked ? "text-amber-400 font-medium" : "text-emerald-400 font-medium"}>
                        {s.isBooked ? "Booked by Student" : "Open for Booking"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemove(s.id)}
                    disabled={removingId === s.id}
                    className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition self-start sm:self-auto disabled:opacity-50"
                  >
                    {removingId === s.id ? <Spinner size={12} /> : "✕ Remove Slot"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
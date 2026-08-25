import { useEffect, useState } from "react";
import { getAvailability, bookAppointment } from "../api";

export default function AppointmentScheduler({ onBooked }) {
  const [slots, setSlots] = useState([]);
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await getAvailability();
      setSlots(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleBook() {
    if (!selected) return;
    try {
      const appt = await bookAppointment(selected);
      setConfirmed(appt);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  if (confirmed) {
    return (
      <div className="max-w-md mx-auto py-16 px-6 text-center">
        <h1 className="font-display text-2xl mb-2">You're booked</h1>
        <p className="text-ink/60 mb-6">
          Your session with <strong>{confirmed.counselorName}</strong> is set
          for <strong>{new Date(confirmed.start).toLocaleString()}</strong> to <strong>{new Date(confirmed.end).toLocaleString()}</strong>.
        </p>
        <button onClick={() => onBooked?.()} className="text-sm font-semibold text-ink underline">
          View my appointments
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-3 py-8 sm:px-6 sm:py-12">
      <p className="text-teal font-semibold tracking-[0.2em] text-[10px] sm:text-xs mb-2">BOOK SUPPORT</p>
      <h1 className="font-display text-2xl sm:text-3xl text-ink mb-6">Talk to a counselor</h1>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {loading && <p className="text-ink/50 text-sm">Loading available times…</p>}
      {!loading && slots.length === 0 && (
        <p className="text-ink/50 text-sm">No open slots right now — please check back soon.</p>
      )}

      <div className="space-y-2 mb-6">
        {slots.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelected(s.id)}
            className={`w-full text-left text-sm rounded-xl py-3 px-4 border transition ${
              selected === s.id ? "bg-ink text-white border-ink" : "border-ink/15 hover:border-ink/40"
            }`}
          >
            <div className="font-medium">{new Date(s.start).toLocaleString()}</div>
            <div className="text-xs opacity-80">to {new Date(s.end).toLocaleString()}</div>
            <div className="mt-1 text-xs opacity-80">with {s.counselorName}</div>
          </button>
        ))}
      </div>

      <button
        onClick={handleBook}
        disabled={!selected}
        className="w-full bg-teal text-ink font-semibold rounded-lg py-3 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-95 transition"
      >
        Confirm booking
      </button>
    </div>
  );
}

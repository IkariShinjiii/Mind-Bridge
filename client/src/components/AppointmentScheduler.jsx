import { useEffect, useState } from "react";
import { getAvailability, bookAppointment } from "../api";

export default function AppointmentScheduler({ onBooked }) {
  const [slots, setSlots] = useState([]);
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAvailability()
      .then(setSlots)
      .finally(() => setLoading(false));
  }, []);

  async function handleBook() {
    if (!selected) return;
    const appt = await bookAppointment(selected);
    setConfirmed(appt);
  }

  if (confirmed) {
    return (
      <div className="max-w-md mx-auto py-16 px-6 text-center">
        <h1 className="font-display text-2xl mb-2">You're booked</h1>
        <p className="text-ink/60 mb-6">
          Your session with <strong>{confirmed.counselorName}</strong> is set
          for <strong>{confirmed.slot}</strong>.
        </p>
        <button
          onClick={() => onBooked?.()}
          className="text-sm font-semibold text-ink underline"
        >
          View my appointments
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 px-6">
      <p className="text-teal font-semibold tracking-widest text-xs mb-2">
        BOOK SUPPORT
      </p>
      <h1 className="font-display text-3xl text-ink mb-6">Talk to a counselor</h1>

      {loading && <p className="text-ink/50 text-sm">Loading available times…</p>}

      {!loading && slots.length === 0 && (
        <p className="text-ink/50 text-sm">
          No open slots right now — please check back soon.
        </p>
      )}

      <div className="space-y-2 mb-6">
        {slots.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelected(s.id)}
            className={`w-full text-left text-sm rounded-lg py-2.5 px-4 border transition ${
              selected === s.id
                ? "bg-ink text-white border-ink"
                : "border-ink/15 hover:border-ink/40"
            }`}
          >
            {s.slot} · with {s.counselorName}
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

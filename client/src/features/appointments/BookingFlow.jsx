import React, { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import Spinner from "../../components/ui/Spinner";

const toDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};
const dayLabel = (d) =>
  d ? d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : "Date to be confirmed";
const timeLabel = (d) => (d ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "");
const slotStart = (slot) => toDate(slot.start || slot.date || slot.time);
const slotEnd = (slot) => toDate(slot.end || slot.to);

const STEPS = ["Counselor", "Time", "Confirm"];

// Three stops: pick a counselor, pick a time, confirm. Skips the first stop when only one counselor has open times.
export default function BookingFlow({ slots, loading, bookingId, onBook, onCancel }) {
  const counselors = useMemo(() => {
    const map = new Map();
    slots.forEach((slot) => {
      const key = slot.counselorId || slot.counselorName || "unassigned";
      if (!map.has(key)) map.set(key, { key, name: slot.counselorName || "Assigned counselor", slots: [] });
      map.get(key).slots.push(slot);
    });
    return [...map.values()].map((c) => ({
      ...c,
      slots: [...c.slots].sort((a, b) => (slotStart(a)?.getTime() || 0) - (slotStart(b)?.getTime() || 0)),
    }));
  }, [slots]);

  const [counselorKey, setCounselorKey] = useState(null);
  const [chosen, setChosen] = useState(null);

  const single = counselors.length === 1;
  const counselor = counselors.find((c) => c.key === counselorKey) || (single ? counselors[0] : null);
  const step = chosen ? 3 : counselor ? 2 : 1;

  const days = useMemo(() => {
    if (!counselor) return [];
    const groups = [];
    counselor.slots.forEach((slot) => {
      const label = dayLabel(slotStart(slot));
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.slots.push(slot);
      else groups.push({ label, slots: [slot] });
    });
    return groups;
  }, [counselor]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-[color:var(--mb-muted)]">
        <Spinner size={18} /> Finding open times…
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[color:var(--mb-line)] p-6 text-[color:var(--mb-muted)]">
        No counselor times are open right now. Please check back soon, or visit the Guidance Office in person.
      </div>
    );
  }

  const goTo = (n) => {
    if (n === 1) {
      setChosen(null);
      setCounselorKey(null);
    } else if (n === 2) {
      setChosen(null);
    }
  };

  const start = chosen && slotStart(chosen);
  const end = chosen && slotEnd(chosen);

  return (
    <div>
      <ol className="mb-6 flex gap-2" aria-label="Booking steps">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const here = n === step;
          const done = n < step;
          const skipped = single && n === 1;
          return (
            <li key={label} className="flex-1">
              <button
                type="button"
                onClick={() => goTo(n)}
                disabled={!done || skipped}
                aria-current={here ? "step" : undefined}
                className={`mb-sign flex h-11 w-full items-center justify-center gap-2 rounded border text-lg font-bold disabled:cursor-default ${
                  here
                    ? "border-[color:var(--mb-panel)] bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)]"
                    : done
                      ? "border-[color:var(--mb-brand)] bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-brand)]"
                      : "border-[color:var(--mb-line)] text-[color:var(--mb-muted)]"
                } ${skipped ? "opacity-60" : ""}`}
              >
                {done ? <Check className="h-5 w-5" aria-hidden="true" /> : n}
                <span className="hidden sm:inline">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <div className="space-y-3">
          <p className="mb-sign text-2xl font-bold">Who would you like to see?</p>
          {counselors.map((c) => {
            const first = slotStart(c.slots[0]);
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setCounselorKey(c.key)}
                className="flex w-full items-center justify-between gap-4 rounded-md border border-[color:var(--mb-ink)] bg-[color:var(--mb-surface)] p-4 text-left hover:bg-[color:var(--mb-panel)] hover:text-[color:var(--mb-panel-ink)]"
              >
                <span>
                  <span className="mb-sign block text-2xl font-bold">{c.name}</span>
                  <span className="block opacity-80">
                    {c.slots.length} open {c.slots.length === 1 ? "time" : "times"}. Next: {dayLabel(first)}
                  </span>
                </span>
                <ArrowRight className="h-6 w-6 shrink-0" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      )}

      {step === 2 && counselor && (
        <div className="space-y-4">
          <p className="mb-sign text-2xl font-bold">Pick a time with {counselor.name}</p>
          <div className="max-h-72 space-y-4 overflow-y-auto pr-1">
            {days.map((day) => (
              <div key={day.label}>
                <p className="mb-2 font-bold">{day.label}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {day.slots.map((slot) => {
                    const s = slotStart(slot);
                    const e = slotEnd(slot);
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setChosen(slot)}
                        className="mb-sign min-h-[48px] rounded-md border border-[color:var(--mb-line)] px-3 text-xl font-bold hover:border-[color:var(--mb-ink)] hover:bg-[color:var(--mb-surface-2)]"
                      >
                        {timeLabel(s) || "Time to be confirmed"}
                        {e ? ` to ${timeLabel(e)}` : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {!single && (
            <button type="button" onClick={() => goTo(1)} className="mb-btn mb-btn-line">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Choose a different counselor
            </button>
          )}
        </div>
      )}

      {step === 3 && chosen && (
        <div className="space-y-4">
          <div className="mb-plate p-6">
            <p className="mb-sign text-lg font-bold opacity-90">Please check your booking</p>
            <p className="mb-sign mt-1 text-3xl font-bold leading-tight">{counselor.name}</p>
            <p className="mb-sign text-2xl font-bold">
              {dayLabel(start)}, {timeLabel(start)}
              {end ? ` to ${timeLabel(end)}` : ""}
            </p>
            <p className="mt-3 text-[color:var(--mb-panel-soft)]">
              Your counselor will confirm the request. By booking, you consent to your appointment details being used
              for counseling purposes.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onBook(chosen)}
              disabled={bookingId === chosen.id}
              className="mb-btn mb-btn-solid"
            >
              {bookingId === chosen.id ? <Spinner size={16} className="text-[color:var(--mb-panel-ink)]" /> : null}
              Confirm booking
            </button>
            <button type="button" onClick={() => goTo(2)} className="mb-btn mb-btn-line">
              Pick another time
            </button>
          </div>
        </div>
      )}

      {onCancel && (
        <div className="mt-6 border-t border-[color:var(--mb-line)] pt-4">
          <button type="button" onClick={onCancel} className="mb-btn mb-btn-line">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

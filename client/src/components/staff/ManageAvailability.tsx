import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getMyAvailability, addAvailability, removeAvailability } from "../../lib/api";
import Spinner from "../ui/Spinner";
import { validateAvailabilityWindow } from "../../utils/validation";
import { friendlyError } from "../../utils/errors";
import { parseDate } from "../../utils/dates";
import type { AvailabilitySlot } from "../../types";

/**
 * Clock time such as "9:30 AM".
 * @param {Date} d
 * @returns {string}
 */
function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/**
 * Reads a slot start and end from the several field names older data may use.
 * @param {object} s - availability document
 * @returns {{ start: Date|null, end: Date|null }}
 */
function slotWhen(s: AvailabilitySlot): { start: Date | null; end: Date | null } {
  const start = parseDate(s.start || s.date || s.time);
  const end = parseDate(s.end || s.to);
  return { start, end };
}

export default function ManageAvailability() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");
  const [savingSlot, setSavingSlot] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function load() {
    try {
      const data = await getMyAvailability();
      setSlots(data);
      setLoadError("");
    } catch (err) {
      console.error("Failed to load availability", err);
      setLoadError("Could not load your slots. Check your connection and reload.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (savingSlot) return;
    const errors = validateAvailabilityWindow(start, end);
    const first = errors.start || errors.end;
    if (first) {
      setError(first);
      document.getElementById(errors.start ? "slot-start" : "slot-end")?.focus();
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
      setError(friendlyError(err, "Could not publish that slot. Please try again."));
    } finally {
      setSavingSlot(false);
    }
  }

  async function handleRemove(id: string) {
    if (removingId) return;
    setRemovingId(id);
    try {
      await removeAvailability(id);
      load();
    } catch (err) {
      setError(friendlyError(err, "Could not remove that slot. Please try again."));
    } finally {
      setRemovingId(null);
    }
  }

  // Soonest first; slots with no readable time go last
  const sorted = useMemo(
    () =>
      [...slots].sort((a, b) => {
        const ta = slotWhen(a).start?.getTime() ?? Infinity;
        const tb = slotWhen(b).start?.getTime() ?? Infinity;
        return ta - tb;
      }),
    [slots],
  );
  const openCount = slots.filter((s) => !s.isBooked).length;

  return (
    <div className="space-y-8">
      {/* Publish a slot */}
      <form
        onSubmit={handleAdd}
        noValidate
        className="rounded-md border-2 border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-5"
      >
        <h2 className="font-display text-2xl font-bold text-[color:var(--mb-ink)]">Publish an open slot</h2>
        <p className="mt-1 max-w-[65ch] text-[color:var(--mb-muted)]">
          Students can book any open slot for a confidential on-campus session.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="slot-start" className="mb-1 block font-bold text-[color:var(--mb-ink)]">
              Starts
            </label>
            <input
              id="slot-start"
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "slot-error" : undefined}
              className="mb-field"
              required
            />
          </div>
          <div>
            <label htmlFor="slot-end" className="mb-1 block font-bold text-[color:var(--mb-ink)]">
              Ends
            </label>
            <input
              id="slot-end"
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "slot-error" : undefined}
              className="mb-field"
              required
            />
          </div>
          <button type="submit" disabled={savingSlot} className="mb-btn mb-btn-solid">
            {savingSlot && <Spinner size={16} />}
            {savingSlot ? "Publishing…" : "Publish slot"}
          </button>
        </div>

        {error && (
          <p id="slot-error" role="alert" className="mb-alert mt-4 font-medium">
            {error}
          </p>
        )}
      </form>

      {/* Published slots */}
      <section aria-labelledby="slots-heading">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-[color:var(--mb-line)] pb-2">
          <h2 id="slots-heading" className="font-display text-2xl font-bold text-[color:var(--mb-ink)]">
            Your slots
          </h2>
          {!loading && !loadError && (
            <p className="text-[color:var(--mb-muted)]">
              <span className="font-display text-lg font-bold tabular-nums text-[color:var(--mb-ink)]">
                {openCount}
              </span>{" "}
              open,{" "}
              <span className="font-display text-lg font-bold tabular-nums text-[color:var(--mb-ink)]">
                {slots.length - openCount}
              </span>{" "}
              booked
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 rounded-md border-2 border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-8 text-[color:var(--mb-muted)]">
            <Spinner size={20} className="text-[color:var(--mb-brand)]" />
            <span>Loading your slots…</span>
          </div>
        ) : loadError ? (
          <p role="alert" className="mb-alert font-medium">
            {loadError}
          </p>
        ) : sorted.length === 0 ? (
          <div className="rounded-md border-2 border-dashed border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-8 text-center text-[color:var(--mb-muted)]">
            No slots published yet. Add one above so students can book you.
          </div>
        ) : (
          <ul className="space-y-3">
            {sorted.map((s) => {
              const { start: sStart, end: sEnd } = slotWhen(s);
              const busy = removingId === s.id;

              return (
                <li
                  key={s.id}
                  className="flex flex-col overflow-hidden rounded-md border-2 border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] sm:flex-row sm:items-stretch"
                >
                  <div className="mb-plate flex shrink-0 items-center gap-3 rounded-none px-4 py-2 sm:w-24 sm:flex-col sm:justify-center sm:gap-0 sm:py-3">
                    {sStart ? (
                      <>
                        <span className="text-xs font-bold uppercase tracking-widest opacity-90">
                          {sStart.toLocaleString(undefined, { month: "short" })}
                        </span>
                        <span className="mb-sign text-3xl font-bold leading-none">{sStart.getDate()}</span>
                      </>
                    ) : (
                      <span className="text-sm font-semibold">No date</span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-display text-xl font-bold text-[color:var(--mb-ink)]">
                        {sStart ? formatTime(sStart) : "Time not set"}
                        {sEnd && (
                          <span className="font-normal text-[color:var(--mb-muted)]"> to {formatTime(sEnd)}</span>
                        )}
                      </p>
                      <p
                        className={`mt-1 inline-block rounded border-2 px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                          s.isBooked
                            ? "border-[color:var(--mb-warn)] bg-[color:var(--mb-warn-bg)] text-[color:var(--mb-warn)]"
                            : "border-[color:var(--mb-safe)] bg-[color:var(--mb-safe-bg)] text-[color:var(--mb-safe)]"
                        }`}
                      >
                        {s.isBooked ? "Booked by a student" : "Open for booking"}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRemove(s.id)}
                      disabled={Boolean(removingId)}
                      aria-label={`Remove slot${sStart ? ` on ${sStart.toLocaleDateString()} at ${formatTime(sStart)}` : ""}`}
                      className="mb-btn mb-btn-line !px-4 text-sm !border-[color:var(--mb-urgent)] !text-[color:var(--mb-urgent)] hover:!bg-[color:var(--mb-urgent-bg)] hover:!text-[color:var(--mb-urgent)] self-start sm:self-center"
                    >
                      {busy && <Spinner size={14} />}
                      {busy ? "Removing…" : "Remove slot"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

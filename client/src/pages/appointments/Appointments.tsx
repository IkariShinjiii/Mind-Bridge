import { useEffect, useState, useMemo, useRef, type FormEvent, type ReactNode } from "react";
import { Calendar, AlertCircle, CheckCircle2, Plus } from "lucide-react";
import {
  getAppointments,
  getAllAppointments,
  updateAppointmentStatus,
  bookAppointment,
  getAvailability,
} from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import BookingFlow from "../../components/appointments/BookingFlow";
import { toLocalInputValue, formatDateTime, parseDate } from "../../utils/dates";
import { friendlyError } from "../../utils/errors";
import { validateAvailabilityWindow } from "../../utils/validation";
import { validate } from "../../lib/validate";
import { appointmentActionSchema } from "../../lib/schemas";
import { validateSlotForBooking } from "../../utils/booking";
import { focusById } from "../../utils/dom";
import type { Appointment, AppointmentStatus, AvailabilitySlot, StoredDate } from "../../types";

type StatusKind = "confirmed" | "pending" | "rescheduled" | "completed" | "declined" | "cancelled" | "other";
type ActionType = "decline" | "cancel" | "reschedule";
interface ActionModalState {
  type: ActionType;
  apt: Appointment;
}

/**
 * Splits a date into the month, day and time shown on the appointment date plate.
 * @param {string|number|Date} val
 * @returns {{ month: string, day: number, time: string }|null} null when the date is invalid
 */
function plateParts(val: StoredDate): { month: string; day: number; time: string } | null {
  const d = parseDate(val);
  if (!d) return null;
  return {
    month: d.toLocaleString(undefined, { month: "short" }),
    day: d.getDate(),
    time: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
  };
}

/**
 * Normalises a free-text appointment status into one of: confirmed, pending, rescheduled, completed,
 * declined, cancelled, other.
 * @param {string} [status]
 * @returns {string}
 */
function statusKind(status?: string): StatusKind {
  const s = (status || "Pending Review").toLowerCase();
  if (s.includes("confirm")) return "confirmed";
  if (s.includes("pending")) return "pending";
  if (s.includes("reschedul")) return "rescheduled";
  if (s.includes("complet")) return "completed";
  if (s.includes("declin")) return "declined";
  if (s.includes("cancel")) return "cancelled";
  return "other";
}

const FILTERS = [
  ["all", "All"],
  ["pending", "Pending"],
  ["confirmed", "Confirmed"],
  ["rescheduled", "Rescheduled"],
  ["completed", "Completed"],
  ["cancelled_declined", "Declined or cancelled"],
];

/**
 * True when an appointment belongs under the selected filter tab.
 * @param {{ status?: string }} apt
 * @param {string} filter - "all" or a FILTERS value
 * @returns {boolean}
 */
function matchesFilter(apt: Pick<Appointment, "status">, filter: string): boolean {
  const kind = statusKind(apt.status);
  if (filter === "cancelled_declined") return kind === "declined" || kind === "cancelled";
  return filter === "all" || kind === filter;
}

const STATUS_TONE: Record<StatusKind, string> = {
  confirmed: "border-[color:var(--mb-safe)] bg-[color:var(--mb-safe-bg)] text-[color:var(--mb-safe)]",
  pending: "border-[color:var(--mb-warn)] bg-[color:var(--mb-warn-bg)] text-[color:var(--mb-warn)]",
  rescheduled: "border-[color:var(--mb-violet)] bg-[color:var(--mb-violet-bg)] text-[color:var(--mb-violet)]",
  completed: "border-[color:var(--mb-brand)] bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-brand)]",
  declined: "border-[color:var(--mb-urgent)] bg-[color:var(--mb-urgent-bg)] text-[color:var(--mb-urgent)]",
  cancelled: "border-[color:var(--mb-urgent)] bg-[color:var(--mb-urgent-bg)] text-[color:var(--mb-urgent)]",
  other: "border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] text-[color:var(--mb-muted)]",
};

const NOTE_TONE: Record<"urgent" | "violet" | "brand", string> = {
  urgent: "border-[color:var(--mb-urgent)] bg-[color:var(--mb-urgent-bg)] text-[color:var(--mb-urgent)]",
  violet: "border-[color:var(--mb-violet)] bg-[color:var(--mb-violet-bg)] text-[color:var(--mb-violet)]",
  brand: "border-[color:var(--mb-brand)] bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-brand)]",
};

// Destructive outline button: overrides the hover fill of .mb-btn-line
const DANGER_LINE =
  "!border-[color:var(--mb-urgent)] !text-[color:var(--mb-urgent)] hover:!bg-[color:var(--mb-urgent-bg)] hover:!text-[color:var(--mb-urgent)]";

function Note({ tone, label, children }: { tone: keyof typeof NOTE_TONE; label: string; children: ReactNode }) {
  return (
    <p className={`rounded-md border-2 px-3 py-2 text-sm ${NOTE_TONE[tone]}`}>
      <span className="font-bold">{label}:</span> {children}
    </p>
  );
}

const DECLINE_PRESETS = [
  "Schedule conflict with guidance department event",
  "Selected slot is no longer available",
  "Please select another available appointment slot",
  "Referred to University Health Services (UHS)",
  "Walk-in consultation recommended instead",
];

const CANCELLATION_PRESETS = [
  "Student requested cancellation",
  "Counselor on urgent administrative duty",
  "Emergency campus wellness response",
  "Unable to attend scheduled session",
];

export default function Appointments() {
  const { userRole } = useAuth();
  const isCounselor = userRole === "admin";

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "" | "success" | "error"; message: string }>({
    type: "",
    message: "",
  });

  // Booking Modal State (for students)
  const [showModal, setShowModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  // Action Modal State (Decline, Cancel, Reschedule)
  const [actionModal, setActionModal] = useState<ActionModalState | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [rescheduleStart, setRescheduleStart] = useState("");
  const [rescheduleEnd, setRescheduleEnd] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [loadError, setLoadError] = useState("");

  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const showFeedback = (type: "success" | "error", message: string) => {
    clearTimeout(feedbackTimer.current);
    setFeedback({ type, message });
    feedbackTimer.current = setTimeout(() => setFeedback({ type: "", message: "" }), 6000);
  };
  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  async function loadData() {
    setLoading(true);
    try {
      const data = isCounselor ? await getAllAppointments() : await getAppointments();
      setAppointments(data);
      setLoadError("");
    } catch (err) {
      console.error("Error loading appointments", err);
      setLoadError(friendlyError(err, "Could not load your appointments. Check your connection and try again."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [userRole]);

  async function handleQuickStatusUpdate(id: string, nextStatus: AppointmentStatus) {
    setUpdatingId(id);
    try {
      await updateAppointmentStatus(id, nextStatus);
      showFeedback("success", `Appointment marked as ${nextStatus}.`);
      await loadData();
    } catch (err) {
      console.error("Failed to update status", err);
      showFeedback("error", friendlyError(err, "Could not update the appointment. Please try again."));
    } finally {
      setUpdatingId(null);
    }
  }

  async function openBookingModal() {
    setShowModal(true);
    setLoadingSlots(true);
    setBookingError("");
    try {
      const slots = await getAvailability();
      setAvailableSlots(slots.filter((s) => !s.isBooked));
    } catch (err) {
      console.error("Failed to fetch slots", err);
      setBookingError(friendlyError(err, "Could not load open slots. Close this and try again."));
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleBookSlot(slot: AvailabilitySlot) {
    const check = validateSlotForBooking(slot);
    if (!check.ok) {
      setBookingError(check.error.userMessage);
      return;
    }
    setBookingId(slot.id);
    setBookingError("");
    try {
      await bookAppointment(slot);
      showFeedback("success", "Appointment requested successfully!");
      await loadData();
      setShowModal(false);
    } catch (err) {
      console.error("Booking error", err);
      setBookingError(friendlyError(err, "That slot could not be booked. It may have just been taken. Pick another."));
    } finally {
      setBookingId(null);
    }
  }

  // Open Decline / Cancel / Reschedule Modal
  function openActionModal(type: ActionType, apt: Appointment) {
    setActionModal({ type, apt });
    setActionReason("");
    setActionError("");
    if (type === "reschedule") {
      // Start from the current booking, in local time
      setRescheduleStart(toLocalInputValue(apt.start || apt.date));
      setRescheduleEnd(toLocalInputValue(apt.end));
    }
  }

  function closeActionModal() {
    setActionModal(null);
    setActionError("");
    setActionReason("");
    setRescheduleStart("");
    setRescheduleEnd("");
  }

  // Submit Decline, Cancel, or Reschedule
  async function handleActionSubmit(e: FormEvent) {
    e.preventDefault();
    if (!actionModal) return;
    const { type, apt } = actionModal;

    const parsed = validate(
      appointmentActionSchema,
      type === "reschedule"
        ? { type, reason: actionReason, start: rescheduleStart, end: rescheduleEnd }
        : { type, reason: actionReason },
    );
    if (!parsed.ok) {
      setActionError(parsed.error.userMessage);
      focusById(type === "reschedule" && parsed.error.fieldErrors?.["start"] ? "apt-new-start" : "apt-reason");
      return;
    }
    const reason = parsed.data.reason;
    if (type === "reschedule") {
      const errors = validateAvailabilityWindow(rescheduleStart, rescheduleEnd || rescheduleStart);
      const problem = errors["start"] || (rescheduleEnd ? errors["end"] : "");
      if (problem) {
        setActionError(problem.replace("The start time is in the past.", "Pick a new start time in the future."));
        focusById(errors["start"] ? "apt-new-start" : "apt-new-end");
        return;
      }
    }

    setActionError("");
    setActionSubmitting(true);
    try {
      if (type === "decline") {
        await updateAppointmentStatus(apt.id, "Declined", {
          slotId: apt.slotId,
          declineReason: reason || "Declined by guidance counselor",
          counselorNote: reason,
        });
        showFeedback("success", "Appointment declined and student notified.");
      } else if (type === "cancel") {
        await updateAppointmentStatus(apt.id, "Cancelled", {
          slotId: apt.slotId,
          cancellationReason: reason || "Cancelled",
          cancelledBy: isCounselor ? "counselor" : "student",
        });
        showFeedback("success", "Appointment cancelled successfully.");
      } else if (type === "reschedule") {
        await updateAppointmentStatus(apt.id, "Rescheduled", {
          start: new Date(rescheduleStart).toISOString(),
          end: rescheduleEnd ? new Date(rescheduleEnd).toISOString() : null,
          rescheduleReason: reason || "Rescheduled by counselor",
          counselorNote: reason,
        });
        showFeedback("success", "Appointment rescheduled and updated.");
      }
      await loadData();
      closeActionModal();
    } catch (err) {
      console.error("Action error:", err);
      setActionError(friendlyError(err, "Could not process this request. Please try again."));
    } finally {
      setActionSubmitting(false);
    }
  }

  const filteredAppointments = useMemo(
    () => appointments.filter((apt) => matchesFilter(apt, filter)),
    [appointments, filter],
  );

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map(([val]) => [val, appointments.filter((a) => matchesFilter(a, val)).length])),
    [appointments],
  );

  return (
    <div className="mx-auto max-w-5xl animate-fade-up">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 border-b-2 border-[color:var(--mb-line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-[color:var(--mb-ink)] sm:text-4xl">
            {isCounselor ? "Appointment requests" : "My appointments"}
          </h1>
          <p className="mt-1 max-w-[65ch] text-[color:var(--mb-muted)]">
            {isCounselor
              ? "Confirm, reschedule or close confidential sessions with students."
              : "Your confidential sessions with university guidance counselors."}
          </p>
        </div>

        {!isCounselor && (
          <button type="button" onClick={openBookingModal} className="mb-btn mb-btn-solid self-start sm:self-auto">
            <Plus className="h-5 w-5" aria-hidden="true" />
            Book a counselor
          </button>
        )}
      </div>

      {/* Feedback */}
      <div role="status" aria-live="polite">
        {feedback.message && (
          <div
            className={`mb-6 flex items-center gap-2 rounded-md border-2 px-4 py-3 font-medium ${
              feedback.type === "success"
                ? "border-[color:var(--mb-safe)] bg-[color:var(--mb-safe-bg)] text-[color:var(--mb-safe)]"
                : "border-[color:var(--mb-urgent)] bg-[color:var(--mb-urgent-bg)] text-[color:var(--mb-urgent)]"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter appointments by status">
        {FILTERS.map(([val, label]) => (
          <button
            key={val}
            type="button"
            aria-pressed={filter === val}
            onClick={() => setFilter(val)}
            className={`min-h-[44px] rounded-md border-2 px-4 text-sm font-bold transition-colors ${
              filter === val
                ? "border-[color:var(--mb-panel)] bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)]"
                : "border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] text-[color:var(--mb-ink)] hover:border-[color:var(--mb-muted)]"
            }`}
          >
            {label}
            <span className="ml-2 font-display text-base tabular-nums opacity-80">{counts[val]}</span>
          </button>
        ))}
      </div>

      {/* Schedule */}
      {loadError && !loading && (
        <div role="alert" className="mb-alert mb-6 flex flex-wrap items-center justify-between gap-3 font-medium">
          <span>{loadError}</span>
          <button type="button" onClick={loadData} className="mb-btn mb-btn-line !min-h-[44px] !px-4">
            Try again
          </button>
        </div>
      )}
      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center gap-3 rounded-md border-2 border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-8 text-[color:var(--mb-muted)]">
          <Spinner size={20} className="text-[color:var(--mb-brand)]" />
          <span>Loading appointments…</span>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="rounded-md border-2 border-dashed border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-10 text-center">
          <div className="mb-plate mx-auto mb-4 flex h-14 w-14 items-center justify-center">
            <Calendar className="h-7 w-7" aria-hidden="true" />
          </div>
          <h2 className="font-display text-2xl font-bold text-[color:var(--mb-ink)]">Nothing here yet</h2>
          <p className="mx-auto mt-1 max-w-[50ch] text-[color:var(--mb-muted)]">
            {isCounselor
              ? "No appointment requests match this filter."
              : filter === "all"
                ? "You have no appointments. Pick a counselor and a time that works for you."
                : "You have no appointments in this category."}
          </p>
          {!isCounselor && filter === "all" && (
            <button type="button" onClick={openBookingModal} className="mb-btn mb-btn-solid mt-5">
              Book a counselor
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-4">
          {filteredAppointments.map((apt) => {
            const kind = statusKind(apt.status);
            const status = apt.status || "Pending Review";
            const isPending = kind === "pending";
            const isConfirmed = kind === "confirmed";
            const isRescheduled = kind === "rescheduled";
            const plate = plateParts(apt.start || apt.date);
            const busy = updatingId === apt.id;

            return (
              <li
                key={apt.id}
                className="flex flex-col overflow-hidden rounded-md border-2 border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] sm:flex-row"
              >
                {/* Date plate */}
                <div className="mb-plate flex shrink-0 items-center justify-center gap-3 rounded-none px-5 py-3 text-center sm:w-32 sm:flex-col sm:gap-0 sm:py-5">
                  {plate ? (
                    <>
                      <span className="text-sm font-bold uppercase tracking-widest opacity-90">{plate.month}</span>
                      <span className="mb-sign text-4xl font-bold leading-none sm:text-5xl">{plate.day}</span>
                      <span className="text-sm font-semibold opacity-90 sm:mt-1">{plate.time}</span>
                    </>
                  ) : (
                    <span className="text-sm font-semibold">Time not set</span>
                  )}
                </div>

                <div className="min-w-0 flex-1 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <h2 className="font-display text-xl font-bold text-[color:var(--mb-ink)]">
                      {apt.title || "Counseling session"}
                    </h2>
                    <span
                      className={`rounded border-2 px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${STATUS_TONE[kind]}`}
                    >
                      {status}
                    </span>
                  </div>

                  <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                    <div className="flex gap-2">
                      <dt className="text-[color:var(--mb-muted)]">{isCounselor ? "Student" : "Counselor"}</dt>
                      <dd className="font-semibold text-[color:var(--mb-ink)]">
                        {isCounselor ? apt.studentName || "Student" : apt.counselorName || "Assigned counselor"}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-[color:var(--mb-muted)]">When</dt>
                      <dd className="font-semibold text-[color:var(--mb-ink)]">
                        {formatDateTime(apt.start || apt.date)}
                        {apt.end ? ` to ${formatDateTime(apt.end)}` : ""}
                      </dd>
                    </div>
                    {isCounselor && apt.studentEmail && (
                      <div className="flex gap-2 sm:col-span-2">
                        <dt className="text-[color:var(--mb-muted)]">Email</dt>
                        <dd className="break-all font-mono text-[color:var(--mb-ink)]">{apt.studentEmail}</dd>
                      </div>
                    )}
                  </dl>

                  {/* Reasons and notes: always labelled in words */}
                  <div className="mt-3 space-y-2">
                    {apt.declineReason && (
                      <Note tone="urgent" label="Declined because">
                        {apt.declineReason}
                      </Note>
                    )}
                    {apt.cancellationReason && (
                      <Note tone="urgent" label="Cancelled because">
                        {apt.cancellationReason}
                      </Note>
                    )}
                    {apt.rescheduleReason && (
                      <Note tone="violet" label="Rescheduled because">
                        {apt.rescheduleReason}
                      </Note>
                    )}
                    {apt.counselorNote && !apt.declineReason && !apt.rescheduleReason && (
                      <Note tone="brand" label="Counselor note">
                        {apt.counselorNote}
                      </Note>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {isCounselor ? (
                      <>
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleQuickStatusUpdate(apt.id, "Confirmed")}
                              disabled={busy}
                              className="mb-btn mb-btn-solid !px-4 text-sm"
                            >
                              {busy && <Spinner size={16} />}
                              {busy ? "Confirming…" : "Confirm"}
                            </button>
                            <button
                              type="button"
                              onClick={() => openActionModal("reschedule", apt)}
                              className="mb-btn mb-btn-line !px-4 text-sm"
                            >
                              Reschedule
                            </button>
                            <button
                              type="button"
                              onClick={() => openActionModal("decline", apt)}
                              className={`mb-btn mb-btn-line !px-4 text-sm ${DANGER_LINE}`}
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {(isConfirmed || isRescheduled) && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleQuickStatusUpdate(apt.id, "Completed")}
                              disabled={busy}
                              className="mb-btn mb-btn-solid !px-4 text-sm"
                            >
                              {busy && <Spinner size={16} />}
                              {busy ? "Updating…" : "Mark completed"}
                            </button>
                            <button
                              type="button"
                              onClick={() => openActionModal("reschedule", apt)}
                              className="mb-btn mb-btn-line !px-4 text-sm"
                            >
                              Reschedule
                            </button>
                            <button
                              type="button"
                              onClick={() => openActionModal("cancel", apt)}
                              className={`mb-btn mb-btn-line !px-4 text-sm ${DANGER_LINE}`}
                            >
                              Cancel session
                            </button>
                          </>
                        )}
                        {!isPending && !isConfirmed && !isRescheduled && (
                          <span className="text-sm text-[color:var(--mb-muted)]">Closed. No further actions.</span>
                        )}
                      </>
                    ) : (
                      (isPending || isConfirmed || isRescheduled) && (
                        <button
                          type="button"
                          onClick={() => openActionModal("cancel", apt)}
                          className={`mb-btn mb-btn-line !px-4 text-sm ${DANGER_LINE}`}
                        >
                          Cancel booking
                        </button>
                      )
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* STUDENT BOOKING: counselor, time, confirm */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Book a counselor"
        description="A confidential one-to-one session with university guidance counselors."
        maxWidth="max-w-xl"
      >
        {bookingError && (
          <p role="alert" className="mb-alert font-medium">
            {bookingError}
          </p>
        )}
        <BookingFlow
          slots={availableSlots}
          loading={loadingSlots}
          bookingId={bookingId}
          onBook={handleBookSlot}
          onCancel={() => setShowModal(false)}
        />
      </Modal>

      {/* ACTION MODAL (DECLINE / CANCEL / RESCHEDULE) */}
      <Modal
        isOpen={Boolean(actionModal)}
        onClose={closeActionModal}
        title={
          actionModal?.type === "decline"
            ? "Decline this request"
            : actionModal?.type === "cancel"
              ? "Cancel this appointment"
              : "Reschedule this session"
        }
        description={
          actionModal?.apt
            ? `${isCounselor ? actionModal.apt.studentName || "Student" : actionModal.apt.counselorName || "Your counselor"}, ${formatDateTime(
                actionModal.apt.start || actionModal.apt.date,
              )}`
            : undefined
        }
        maxWidth="max-w-lg"
      >
        {actionModal && (
          <form onSubmit={handleActionSubmit} noValidate className="space-y-5">
            {actionError && (
              <p role="alert" className="mb-alert font-medium">
                {actionError}
              </p>
            )}

            {actionModal.type === "reschedule" && (
              <div className="space-y-4 rounded-md border-2 border-[color:var(--mb-line)] bg-[color:var(--mb-ground)] p-4">
                <div>
                  <label htmlFor="apt-new-start" className="mb-1 block font-bold text-[color:var(--mb-ink)]">
                    New start <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="apt-new-start"
                    type="datetime-local"
                    value={rescheduleStart}
                    onChange={(e) => setRescheduleStart(e.target.value)}
                    required
                    className="mb-field"
                  />
                </div>
                <div>
                  <label htmlFor="apt-new-end" className="mb-1 block font-bold text-[color:var(--mb-ink)]">
                    New end <span className="font-normal text-[color:var(--mb-muted)]">(optional)</span>
                  </label>
                  <input
                    id="apt-new-end"
                    type="datetime-local"
                    value={rescheduleEnd}
                    onChange={(e) => setRescheduleEnd(e.target.value)}
                    className="mb-field"
                  />
                </div>
              </div>
            )}

            {(actionModal.type === "decline" || (actionModal.type === "cancel" && isCounselor)) && (
              <div>
                <p className="mb-2 font-bold text-[color:var(--mb-ink)]">Quick reasons</p>
                <div className="flex flex-wrap gap-2">
                  {(actionModal.type === "decline" ? DECLINE_PRESETS : CANCELLATION_PRESETS).map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setActionReason(preset)}
                      aria-pressed={actionReason === preset}
                      className={`min-h-[44px] rounded-md border-2 px-3 text-left text-sm transition-colors ${
                        actionReason === preset
                          ? "border-[color:var(--mb-panel)] bg-[color:var(--mb-brand-bg)] font-bold text-[color:var(--mb-ink)]"
                          : "border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] text-[color:var(--mb-ink)] hover:border-[color:var(--mb-muted)]"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="apt-reason" className="mb-1 block font-bold text-[color:var(--mb-ink)]">
                {actionModal.type === "reschedule"
                  ? "Note to the student"
                  : actionModal.type === "decline"
                    ? "Explanation for the student"
                    : "Reason for cancelling"}
                {actionModal.type === "decline" && <span aria-hidden="true"> *</span>}
              </label>
              <textarea
                id="apt-reason"
                rows={3}
                maxLength={500}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder={
                  actionModal.type === "reschedule"
                    ? "e.g. Moved 30 minutes later because of a faculty assembly"
                    : actionModal.type === "decline"
                      ? "e.g. Please choose another slot on Wednesday afternoon"
                      : "e.g. Conflict with my exam schedule"
                }
                className="mb-field"
              />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t-2 border-[color:var(--mb-line)] pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeActionModal}
                disabled={actionSubmitting}
                className="mb-btn mb-btn-line"
              >
                Keep as is
              </button>
              <button
                type="submit"
                disabled={actionSubmitting}
                aria-busy={actionSubmitting}
                className={`mb-btn !text-[color:var(--mb-panel-ink)] ${
                  actionModal.type === "reschedule"
                    ? "!border-[color:var(--mb-violet-solid)] !bg-[color:var(--mb-violet-solid)]"
                    : "!border-[color:var(--mb-urgent-solid)] !bg-[color:var(--mb-urgent-solid)]"
                }`}
              >
                {actionSubmitting && <Spinner size={16} />}
                {actionModal.type === "decline" && (actionSubmitting ? "Declining…" : "Decline request")}
                {actionModal.type === "cancel" && (actionSubmitting ? "Cancelling…" : "Cancel appointment")}
                {actionModal.type === "reschedule" && (actionSubmitting ? "Rescheduling…" : "Reschedule session")}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

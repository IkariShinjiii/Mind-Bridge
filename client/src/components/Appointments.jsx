import React, { useEffect, useState, useMemo } from "react";
import { Calendar, AlertCircle, CheckCircle2, Plus } from "lucide-react";
import {
  getAppointments,
  getAllAppointments,
  updateAppointmentStatus,
  bookAppointment,
  getAvailability,
} from "../api";
import { useAuth } from "../AuthContext.jsx";
import Spinner from "./Spinner";
import Modal from "./ui/Modal";
import BookingFlow from "./BookingFlow";

function safeFormatDate(val) {
  if (!val) return "Not specified";
  if (typeof val === "string" && !val.includes("-") && !val.includes("/")) return val;
  const date = new Date(val);
  return Number.isNaN(date.getTime())
    ? val
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function plateParts(val) {
  const d = val ? new Date(val) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return {
    month: d.toLocaleString(undefined, { month: "short" }),
    day: d.getDate(),
    time: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
  };
}

function statusKind(status) {
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

function matchesFilter(apt, filter) {
  const kind = statusKind(apt.status);
  if (filter === "cancelled_declined") return kind === "declined" || kind === "cancelled";
  return filter === "all" || kind === filter;
}

const STATUS_TONE = {
  confirmed: "border-[color:var(--mb-safe)] bg-[color:var(--mb-safe-bg)] text-[color:var(--mb-safe)]",
  pending: "border-[color:var(--mb-warn)] bg-[color:var(--mb-warn-bg)] text-[color:var(--mb-warn)]",
  rescheduled: "border-[color:var(--mb-violet)] bg-[color:var(--mb-violet-bg)] text-[color:var(--mb-violet)]",
  completed: "border-[color:var(--mb-brand)] bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-brand)]",
  declined: "border-[color:var(--mb-urgent)] bg-[color:var(--mb-urgent-bg)] text-[color:var(--mb-urgent)]",
  cancelled: "border-[color:var(--mb-urgent)] bg-[color:var(--mb-urgent-bg)] text-[color:var(--mb-urgent)]",
  other: "border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] text-[color:var(--mb-muted)]",
};

const NOTE_TONE = {
  urgent: "border-[color:var(--mb-urgent)] bg-[color:var(--mb-urgent-bg)] text-[color:var(--mb-urgent)]",
  violet: "border-[color:var(--mb-violet)] bg-[color:var(--mb-violet-bg)] text-[color:var(--mb-violet)]",
  brand: "border-[color:var(--mb-brand)] bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-brand)]",
};

// Destructive outline button: overrides the hover fill of .mb-btn-line
const DANGER_LINE =
  "!border-[color:var(--mb-urgent)] !text-[color:var(--mb-urgent)] hover:!bg-[color:var(--mb-urgent-bg)] hover:!text-[color:var(--mb-urgent)]";

function Note({ tone, label, children }) {
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
  const { currentUser, userRole } = useAuth();
  const isCounselor = userRole === "counselor" || userRole === "admin";

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Booking Modal State (for students)
  const [showModal, setShowModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingId, setBookingId] = useState(null);

  // Action Modal State (Decline, Cancel, Reschedule)
  const [actionModal, setActionModal] = useState(null); // { type: 'decline' | 'cancel' | 'reschedule', apt: {...} }
  const [actionReason, setActionReason] = useState("");
  const [rescheduleStart, setRescheduleStart] = useState("");
  const [rescheduleEnd, setRescheduleEnd] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback({ type: "", message: "" });
    }, 4000);
  };

  async function loadData() {
    setLoading(true);
    try {
      const data = isCounselor ? await getAllAppointments() : await getAppointments();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading appointments", err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [userRole]);

  async function handleQuickStatusUpdate(id, nextStatus) {
    setUpdatingId(id);
    try {
      await updateAppointmentStatus(id, nextStatus);
      showFeedback("success", `Appointment marked as ${nextStatus}.`);
      await loadData();
    } catch (err) {
      console.error("Failed to update status", err);
      showFeedback("error", "Failed to update appointment status.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function openBookingModal() {
    setShowModal(true);
    setLoadingSlots(true);
    try {
      const slots = await getAvailability();
      setAvailableSlots(slots.filter((s) => !s.isBooked));
    } catch (err) {
      console.error("Failed to fetch slots", err);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleBookSlot(slot) {
    setBookingId(slot.id);
    try {
      await bookAppointment(slot);
      showFeedback("success", "Appointment requested successfully!");
      await loadData();
      setShowModal(false);
    } catch (err) {
      console.error("Booking error", err);
      showFeedback("error", "Could not book appointment.");
    } finally {
      setBookingId(null);
    }
  }

  // Open Decline / Cancel / Reschedule Modal
  function openActionModal(type, apt) {
    setActionModal({ type, apt });
    setActionReason("");
    if (type === "reschedule") {
      // Default to existing start date or tomorrow
      const currentStart = apt.start || apt.date;
      if (currentStart) {
        try {
          const d = new Date(currentStart);
          setRescheduleStart(d.toISOString().slice(0, 16));
        } catch {
          setRescheduleStart("");
        }
      }
      if (apt.end) {
        try {
          const dEnd = new Date(apt.end);
          setRescheduleEnd(dEnd.toISOString().slice(0, 16));
        } catch {
          setRescheduleEnd("");
        }
      }
    }
  }

  function closeActionModal() {
    setActionModal(null);
    setActionReason("");
    setRescheduleStart("");
    setRescheduleEnd("");
  }

  // Submit Decline, Cancel, or Reschedule
  async function handleActionSubmit(e) {
    e.preventDefault();
    if (!actionModal) return;
    const { type, apt } = actionModal;

    setActionSubmitting(true);
    try {
      if (type === "decline") {
        await updateAppointmentStatus(apt.id, "Declined", {
          slotId: apt.slotId,
          declineReason: actionReason.trim() || "Declined by guidance counselor",
          counselorNote: actionReason.trim(),
        });
        showFeedback("success", "Appointment declined and student notified.");
      } else if (type === "cancel") {
        await updateAppointmentStatus(apt.id, "Cancelled", {
          slotId: apt.slotId,
          cancellationReason: actionReason.trim() || "Cancelled",
          cancelledBy: isCounselor ? "counselor" : "student",
        });
        showFeedback("success", "Appointment cancelled successfully.");
      } else if (type === "reschedule") {
        if (!rescheduleStart) {
          showFeedback("error", "Please select a new appointment date & time.");
          setActionSubmitting(false);
          return;
        }
        await updateAppointmentStatus(apt.id, "Rescheduled", {
          start: new Date(rescheduleStart).toISOString(),
          end: rescheduleEnd ? new Date(rescheduleEnd).toISOString() : null,
          rescheduleReason: actionReason.trim() || "Rescheduled by counselor",
          counselorNote: actionReason.trim(),
        });
        showFeedback("success", "Appointment rescheduled and updated.");
      }
      await loadData();
      closeActionModal();
    } catch (err) {
      console.error("Action error:", err);
      showFeedback("error", "Failed to process appointment request.");
    } finally {
      setActionSubmitting(false);
    }
  }

  const filteredAppointments = useMemo(
    () => appointments.filter((apt) => matchesFilter(apt, filter)),
    [appointments, filter]
  );

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map(([val]) => [val, appointments.filter((a) => matchesFilter(a, val)).length])),
    [appointments]
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
          <button onClick={openBookingModal} className="mb-btn mb-btn-solid self-start sm:self-auto">
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
            <button onClick={openBookingModal} className="mb-btn mb-btn-solid mt-5">
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
                        {safeFormatDate(apt.start || apt.date)}
                        {apt.end ? ` to ${safeFormatDate(apt.end)}` : ""}
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
                    {apt.declineReason && <Note tone="urgent" label="Declined because">{apt.declineReason}</Note>}
                    {apt.cancellationReason && (
                      <Note tone="urgent" label="Cancelled because">{apt.cancellationReason}</Note>
                    )}
                    {apt.rescheduleReason && (
                      <Note tone="violet" label="Rescheduled because">{apt.rescheduleReason}</Note>
                    )}
                    {apt.counselorNote && !apt.declineReason && !apt.rescheduleReason && (
                      <Note tone="brand" label="Counselor note">{apt.counselorNote}</Note>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {isCounselor ? (
                      <>
                        {isPending && (
                          <>
                            <button
                              onClick={() => handleQuickStatusUpdate(apt.id, "Confirmed")}
                              disabled={busy}
                              className="mb-btn mb-btn-solid !px-4 text-sm"
                            >
                              {busy ? "Confirming…" : "Confirm"}
                            </button>
                            <button
                              onClick={() => openActionModal("reschedule", apt)}
                              className="mb-btn mb-btn-line !px-4 text-sm"
                            >
                              Reschedule
                            </button>
                            <button
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
                              onClick={() => handleQuickStatusUpdate(apt.id, "Completed")}
                              disabled={busy}
                              className="mb-btn mb-btn-solid !px-4 text-sm"
                            >
                              {busy ? "Updating…" : "Mark completed"}
                            </button>
                            <button
                              onClick={() => openActionModal("reschedule", apt)}
                              className="mb-btn mb-btn-line !px-4 text-sm"
                            >
                              Reschedule
                            </button>
                            <button
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
            ? `${isCounselor ? actionModal.apt.studentName || "Student" : actionModal.apt.counselorName || "Your counselor"}, ${safeFormatDate(
                actionModal.apt.start || actionModal.apt.date
              )}`
            : undefined
        }
        maxWidth="max-w-lg"
      >
        {actionModal && (
          <form onSubmit={handleActionSubmit} className="space-y-5">
            {actionModal.type === "reschedule" && (
              <div className="space-y-4 rounded-md border-2 border-[color:var(--mb-line)] bg-[color:var(--mb-ground)] p-4">
                <div>
                  <label htmlFor="apt-new-start" className="mb-1 block font-bold text-[color:var(--mb-ink)]">
                    New start
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
              </label>
              <textarea
                id="apt-reason"
                rows={3}
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
                className={`mb-btn !text-[color:var(--mb-panel-ink)] ${
                  actionModal.type === "reschedule"
                    ? "!border-[color:var(--mb-violet-solid)] !bg-[color:var(--mb-violet-solid)]"
                    : "!border-[color:var(--mb-urgent-solid)] !bg-[color:var(--mb-urgent-solid)]"
                }`}
              >
                {actionSubmitting && <Spinner size={16} />}
                {actionModal.type === "decline" && "Decline request"}
                {actionModal.type === "cancel" && "Cancel appointment"}
                {actionModal.type === "reschedule" && "Reschedule session"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

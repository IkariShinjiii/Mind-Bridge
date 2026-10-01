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

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const status = (apt.status || "Pending Review").toLowerCase();
      if (filter === "confirmed") return status.includes("confirm");
      if (filter === "pending") return status.includes("pending");
      if (filter === "rescheduled") return status.includes("reschedul");
      if (filter === "completed") return status.includes("complet");
      if (filter === "cancelled_declined")
        return status.includes("cancel") || status.includes("declin");
      return true;
    });
  }, [appointments, filter]);

  return (
    <div className="mx-auto max-w-6xl animate-fade-up">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[color:var(--mb-line)] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--mb-ink)] sm:text-3xl">
            Counseling Appointments
          </h1>
          <p className="text-sm text-[color:var(--mb-muted)] mt-1">
            {isCounselor
              ? "Review, confirm, reschedule, or manage confidential counseling sessions with students."
              : "Manage and book confidential counseling sessions with University guidance counselors."}
          </p>
        </div>

        {!isCounselor && (
          <button
            onClick={openBookingModal}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[color:var(--mb-panel)] px-5 py-2.5 text-sm font-semibold text-[color:var(--mb-panel-ink)] shadow-sm transition-all hover:bg-[color:var(--mb-panel)] hover:scale-[1.01] active:scale-[0.99] self-start sm:self-auto interactive-tap"
          >
            <Plus className="h-4 w-4" />
            <span>Book New Appointment</span>
          </button>
        )}
      </div>

      {/* Global Feedback Banner */}
      {feedback.message && (
        <div
          className={`mb-6 rounded-md border p-4 text-xs sm:text-sm font-medium transition-all flex items-center gap-2 ${
            feedback.type === "success"
              ? "border-[color:var(--mb-safe)] bg-[color:var(--mb-safe-bg)] text-[color:var(--mb-safe)]"
              : "border-[color:var(--mb-urgent)] bg-[color:var(--mb-urgent-bg)] text-[color:var(--mb-urgent)]"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-[color:var(--mb-safe)] shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-[color:var(--mb-urgent)] shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          ["all", "All Sessions"],
          ["pending", "Pending Review"],
          ["confirmed", "Confirmed"],
          ["rescheduled", "Rescheduled"],
          ["completed", "Completed"],
          ["cancelled_declined", "Declined / Cancelled"],
        ].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              filter === val
                ? "bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)] shadow-sm font-semibold"
                : "border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] text-[color:var(--mb-muted)] hover:border-[color:var(--mb-line)] hover:text-[color:var(--mb-ink)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-8 text-[color:var(--mb-muted)] gap-3">
          <Spinner size={20} className="text-[color:var(--mb-brand)]" />
          <span className="text-sm">Loading appointment records...</span>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="rounded-md border border-dashed border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-12 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-md bg-[color:var(--mb-surface-2)] text-[color:var(--mb-brand)]">
            <Calendar className="h-7 w-7" />
          </div>
          <h3 className="text-base font-semibold text-[color:var(--mb-ink)]">No Appointments Found</h3>
          <p className="mt-1 text-sm text-[color:var(--mb-muted)] max-w-md mx-auto">
            {isCounselor
              ? "There are currently no appointment requests matching this filter."
              : "You do not have any appointments scheduled in this category. Click 'Book New Appointment' to schedule a time slot."}
          </p>
          {!isCounselor && (
            <button
              onClick={openBookingModal}
              className="mt-5 rounded-md bg-[color:var(--mb-panel)] px-5 py-2.5 text-xs font-semibold text-[color:var(--mb-panel-ink)] hover:bg-[color:var(--mb-panel)] transition interactive-tap"
            >
              Book Counselor Session
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredAppointments.map((apt) => {
            const status = apt.status || "Pending Review";
            const statusLower = status.toLowerCase();
            const isConfirmed = statusLower.includes("confirm");
            const isPending = statusLower.includes("pending");
            const isRescheduled = statusLower.includes("reschedul");
            const isCompleted = statusLower.includes("complet");
            const isDeclined = statusLower.includes("declin");
            const isCancelled = statusLower.includes("cancel");

            return (
              <div
                key={apt.id}
                className="flex flex-col gap-3 rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-4 sm:p-5 transition hover:border-[color:var(--mb-line)] shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[color:var(--mb-ink)] text-base">
                        {apt.title || "Counseling Session"}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                          isConfirmed
                            ? "bg-[color:var(--mb-safe-bg)] text-[color:var(--mb-safe)] border border-[color:var(--mb-safe)]"
                            : isPending
                            ? "bg-[color:var(--mb-warn-bg)] text-[color:var(--mb-warn)] border border-[color:var(--mb-warn)]"
                            : isRescheduled
                            ? "bg-[color:var(--mb-violet-bg)] text-[color:var(--mb-violet)] border border-[color:var(--mb-violet)]"
                            : isCompleted
                            ? "bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-brand)] border border-[color:var(--mb-brand)]"
                            : isDeclined
                            ? "bg-[color:var(--mb-urgent-bg)] text-[color:var(--mb-urgent)] border border-[color:var(--mb-urgent)]"
                            : isCancelled
                            ? "bg-[color:var(--mb-urgent-bg)] text-[color:var(--mb-urgent)] border border-[color:var(--mb-urgent)]"
                            : "bg-[color:var(--mb-surface-2)] text-[color:var(--mb-muted)] border border-[color:var(--mb-line)]"
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[color:var(--mb-muted)]">
                      <div>
                        {isCounselor ? "Student:" : "Counselor:"}{" "}
                        <span className="text-[color:var(--mb-ink)] font-medium">
                          {isCounselor
                            ? apt.studentName || "Student"
                            : apt.counselorName || "Assigned Counselor"}
                        </span>
                      </div>
                      {apt.studentEmail && (
                        <div>
                          Email: <span className="text-[color:var(--mb-brand)] font-mono">{apt.studentEmail}</span>
                        </div>
                      )}
                      <div>
                        Time:{" "}
                        <span className="text-[color:var(--mb-brand)] font-medium">
                          {safeFormatDate(apt.start || apt.date)}
                          {apt.end ? ` - ${safeFormatDate(apt.end)}` : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                    {isCounselor ? (
                      <>
                        {/* Pending Review Actions */}
                        {isPending && (
                          <>
                            <button
                              onClick={() => handleQuickStatusUpdate(apt.id, "Confirmed")}
                              disabled={updatingId === apt.id}
                              className="rounded-md bg-[color:var(--mb-panel)] px-3 py-1.5 text-xs font-semibold text-[color:var(--mb-panel-ink)] hover:bg-[color:var(--mb-panel)] transition disabled:opacity-50"
                            >
                              {updatingId === apt.id ? "Confirming…" : "✓ Confirm"}
                            </button>
                            <button
                              onClick={() => openActionModal("reschedule", apt)}
                              className="rounded-md border border-[color:var(--mb-violet)] bg-[color:var(--mb-violet-bg)] px-3 py-1.5 text-xs font-semibold text-[color:var(--mb-violet)] hover:bg-[color:var(--mb-violet-bg)] transition"
                            >
                              🗓️ Reschedule
                            </button>
                            <button
                              onClick={() => openActionModal("decline", apt)}
                              className="rounded-md border border-[color:var(--mb-urgent)] bg-[color:var(--mb-urgent-bg)] px-3 py-1.5 text-xs font-semibold text-[color:var(--mb-urgent)] hover:bg-[color:var(--mb-urgent-bg)] transition"
                            >
                              ✕ Decline
                            </button>
                          </>
                        )}

                        {/* Confirmed / Rescheduled Actions */}
                        {(isConfirmed || isRescheduled) && (
                          <>
                            <button
                              onClick={() => handleQuickStatusUpdate(apt.id, "Completed")}
                              disabled={updatingId === apt.id}
                              className="rounded-md bg-[color:var(--mb-safe-solid)] px-3 py-1.5 text-xs font-semibold text-[color:var(--mb-panel-ink)] hover:bg-[color:var(--mb-safe-solid)] transition disabled:opacity-50"
                            >
                              {updatingId === apt.id ? "Updating…" : "✓ Mark Completed"}
                            </button>
                            <button
                              onClick={() => openActionModal("reschedule", apt)}
                              className="rounded-md border border-[color:var(--mb-violet)] bg-[color:var(--mb-violet-bg)] px-3 py-1.5 text-xs font-semibold text-[color:var(--mb-violet)] hover:bg-[color:var(--mb-violet-bg)] transition"
                            >
                              🗓️ Reschedule
                            </button>
                            <button
                              onClick={() => openActionModal("cancel", apt)}
                              className="rounded-md border border-[color:var(--mb-urgent)] bg-[color:var(--mb-urgent-bg)] px-3 py-1.5 text-xs font-semibold text-[color:var(--mb-urgent)] hover:bg-[color:var(--mb-urgent-bg)] transition"
                            >
                              ✕ Cancel
                            </button>
                          </>
                        )}

                        {/* Completed or Cancelled notes */}
                        {(isCompleted || isDeclined || isCancelled) && (
                          <span className="text-xs text-[color:var(--mb-muted)] italic">Archived session</span>
                        )}
                      </>
                    ) : (
                      /* Student Actions */
                      <>
                        {(isPending || isConfirmed || isRescheduled) && (
                          <button
                            onClick={() => openActionModal("cancel", apt)}
                            className="rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] px-3 py-1.5 text-xs font-medium text-[color:var(--mb-urgent)] hover:bg-[color:var(--mb-urgent-bg)] hover:border-[color:var(--mb-urgent)] transition"
                          >
                            Cancel Booking
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* CALLOUT NOTES / REASONS */}
                {apt.declineReason && (
                  <div className="rounded-md border border-[color:var(--mb-urgent)] bg-[color:var(--mb-urgent-bg)] p-3 text-xs text-[color:var(--mb-urgent)]">
                    <span className="font-semibold text-[color:var(--mb-urgent)]">Decline Reason:</span>{" "}
                    {apt.declineReason}
                  </div>
                )}

                {apt.cancellationReason && (
                  <div className="rounded-md border border-[color:var(--mb-urgent)] bg-[color:var(--mb-urgent-bg)] p-3 text-xs text-[color:var(--mb-urgent)]">
                    <span className="font-semibold text-[color:var(--mb-urgent)]">Cancellation Reason:</span>{" "}
                    {apt.cancellationReason}
                  </div>
                )}

                {apt.rescheduleReason && (
                  <div className="rounded-md border border-[color:var(--mb-violet)] bg-[color:var(--mb-violet-bg)] p-3 text-xs text-[color:var(--mb-violet)]">
                    <span className="font-semibold text-[color:var(--mb-violet)]">Reschedule Note:</span>{" "}
                    {apt.rescheduleReason}
                  </div>
                )}

                {apt.counselorNote && !apt.declineReason && !apt.rescheduleReason && (
                  <div className="rounded-md border border-[color:var(--mb-brand)] bg-[color:var(--mb-brand-bg)] p-3 text-xs text-[color:var(--mb-brand)]">
                    <span className="font-semibold text-[color:var(--mb-brand)]">Counselor Note:</span>{" "}
                    {apt.counselorNote}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* STUDENT BOOKING MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Select Available Counselor Slot"
        description="Choose a confidential time slot with an assigned university guidance counselor. By booking, you consent to the collection and processing of your appointment details for counseling purposes."
        maxWidth="max-w-lg"
        footer={
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="min-h-[44px] rounded-md border border-[color:var(--mb-line)] px-5 text-xs font-medium text-[color:var(--mb-muted)] hover:bg-[color:var(--mb-surface-2)] hover:text-[color:var(--mb-ink)] transition interactive-tap"
          >
            Cancel
          </button>
        }
      >
        {loadingSlots ? (
          <div className="py-8 text-center text-[color:var(--mb-muted)] flex items-center justify-center gap-2 text-xs sm:text-sm">
            <Spinner size={18} /> Loading open counselor slots...
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="py-8 text-center text-[color:var(--mb-muted)] border border-dashed border-[color:var(--mb-line)] rounded-md p-4 text-xs sm:text-sm">
            No open counselor slots available right now. Please check back soon or visit the
            University Guidance Office directly.
          </div>
        ) : (
          <div className="space-y-3 custom-scrollbar">
            {availableSlots.map((slot) => {
              const startTime = safeFormatDate(slot.start || slot.date || slot.time);
              const endTime = safeFormatDate(slot.end || slot.to);

              return (
                <div
                  key={slot.id}
                  className="flex items-center justify-between rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] p-3.5 sm:p-4 text-xs sm:text-sm hover:border-[color:var(--mb-brand)] transition"
                >
                  <div className="pr-2">
                    <div className="font-medium text-[color:var(--mb-ink)]">
                      Counselor: {slot.counselorName || "Assigned Counselor"}
                    </div>
                    <div className="text-[color:var(--mb-brand)] mt-0.5 font-medium text-xs">
                      {startTime} {endTime ? `to ${endTime}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => handleBookSlot(slot)}
                    disabled={bookingId === slot.id}
                    className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-md bg-[color:var(--mb-panel)] px-4 py-2 text-xs font-semibold text-[color:var(--mb-panel-ink)] hover:bg-[color:var(--mb-panel)] disabled:opacity-50 interactive-tap shrink-0"
                  >
                    {bookingId === slot.id ? <Spinner size={14} /> : "Book Slot"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* ACTION MODAL (DECLINE / CANCEL / RESCHEDULE) */}
      <Modal
        isOpen={Boolean(actionModal)}
        onClose={closeActionModal}
        title={
          actionModal?.type === "decline"
            ? "Decline Counseling Request"
            : actionModal?.type === "cancel"
            ? "Cancel Appointment"
            : "Reschedule Counseling Session"
        }
        description={
          actionModal?.apt
            ? `Student: ${actionModal.apt.studentName || "Student"} (${safeFormatDate(
                actionModal.apt.start || actionModal.apt.date
              )})`
            : undefined
        }
        maxWidth="max-w-lg"
      >
        {actionModal && (
          <form onSubmit={handleActionSubmit} className="space-y-4">
            {/* Reschedule Date & Time Inputs */}
            {actionModal.type === "reschedule" && (
              <div className="space-y-3 rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-ground)] p-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[color:var(--mb-muted)] mb-1">
                    New Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={rescheduleStart}
                    onChange={(e) => setRescheduleStart(e.target.value)}
                    required
                    className="w-full rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] px-3 py-2 text-xs sm:text-sm text-[color:var(--mb-ink)] focus:border-[color:var(--mb-brand)] focus:outline-none focus:ring-1 focus:ring-[color:var(--mb-focus)] min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[color:var(--mb-muted)] mb-1">
                    New End Date & Time <span className="text-[10px] text-[color:var(--mb-muted)]">(Optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={rescheduleEnd}
                    onChange={(e) => setRescheduleEnd(e.target.value)}
                    className="w-full rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] px-3 py-2 text-xs sm:text-sm text-[color:var(--mb-ink)] focus:border-[color:var(--mb-brand)] focus:outline-none focus:ring-1 focus:ring-[color:var(--mb-focus)] min-h-[44px]"
                  />
                </div>
              </div>
            )}

            {/* Quick Presets for Decline or Cancel */}
            {actionModal.type === "decline" && (
              <div>
                <label className="block text-xs font-medium text-[color:var(--mb-muted)] mb-1.5">
                  Quick Reason Presets:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DECLINE_PRESETS.map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setActionReason(preset)}
                      className="min-h-[36px] rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] px-2.5 py-1 text-[11px] text-[color:var(--mb-muted)] hover:border-[color:var(--mb-brand)] hover:text-[color:var(--mb-ink)] transition interactive-tap"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {actionModal.type === "cancel" && isCounselor && (
              <div>
                <label className="block text-xs font-medium text-[color:var(--mb-muted)] mb-1.5">
                  Quick Reason Presets:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CANCELLATION_PRESETS.map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setActionReason(preset)}
                      className="min-h-[36px] rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] px-2.5 py-1 text-[11px] text-[color:var(--mb-muted)] hover:border-[color:var(--mb-brand)] hover:text-[color:var(--mb-ink)] transition interactive-tap"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes / Reason Textarea */}
            <div>
              <label className="block text-xs font-medium text-[color:var(--mb-muted)] mb-1.5">
                {actionModal.type === "reschedule"
                  ? "Reschedule Explanation / Note to Student:"
                  : actionModal.type === "decline"
                  ? "Decline Explanation to Student:"
                  : "Cancellation Reason:"}
              </label>
              <textarea
                rows={3}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder={
                  actionModal.type === "reschedule"
                    ? "e.g. Moved 30 minutes later due to faculty guidance assembly..."
                    : actionModal.type === "decline"
                    ? "e.g. Please choose another slot on Wednesday afternoon..."
                    : "e.g. Conflict with examination schedule..."
                }
                className="w-full rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] px-3.5 py-2.5 text-xs sm:text-sm text-[color:var(--mb-ink)] placeholder:text-[color:var(--mb-muted)] focus:border-[color:var(--mb-brand)] focus:outline-none focus:ring-1 focus:ring-[color:var(--mb-focus)]"
              />
            </div>

            {/* Buttons */}
            <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-[color:var(--mb-line)]">
              <button
                type="button"
                onClick={closeActionModal}
                disabled={actionSubmitting}
                className="min-h-[44px] rounded-md border border-[color:var(--mb-line)] px-4 text-xs font-medium text-[color:var(--mb-muted)] hover:bg-[color:var(--mb-surface-2)] hover:text-[color:var(--mb-ink)] transition interactive-tap"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionSubmitting}
                className={`min-h-[44px] inline-flex items-center justify-center gap-2 rounded-md px-5 text-xs font-semibold text-[color:var(--mb-ink)] transition interactive-tap ${
                  actionModal.type === "decline"
                    ? "bg-[color:var(--mb-urgent-solid)] hover:bg-[color:var(--mb-urgent-solid)]"
                    : actionModal.type === "cancel"
                    ? "bg-[color:var(--mb-urgent-solid)] hover:bg-[color:var(--mb-urgent-solid)]"
                    : "bg-[color:var(--mb-violet-solid)] hover:bg-[color:var(--mb-violet-solid)]"
                } disabled:opacity-50`}
              >
                {actionSubmitting && <Spinner size={14} />}
                {actionModal.type === "decline" && "Confirm Decline"}
                {actionModal.type === "cancel" && "Confirm Cancellation"}
                {actionModal.type === "reschedule" && "Confirm Reschedule"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

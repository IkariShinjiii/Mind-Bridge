import React, { useEffect, useState, useMemo } from "react";
import { getAppointments, getAllAppointments, updateAppointmentStatus, bookAppointment, getAvailability } from "../api";
import { useAuth } from "../AuthContext.jsx";
import Spinner from "./Spinner";

function safeFormatDate(val) {
  if (!val) return "Not specified";
  if (typeof val === "string" && !val.includes("-") && !val.includes("/")) return val;
  const date = new Date(val);
  return Number.isNaN(date.getTime()) ? val : date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function Appointments() {
  const { currentUser, userRole, userData } = useAuth();
  const isCounselor = userRole === "counselor" || userRole === "admin";

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);

  // Booking Modal State (for students)
  const [showModal, setShowModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingId, setBookingId] = useState(null);

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

  async function handleStatusUpdate(id, nextStatus) {
    setUpdatingId(id);
    try {
      await updateAppointmentStatus(id, nextStatus);
      await loadData();
    } catch (err) {
      console.error("Failed to update status", err);
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
      await loadData();
      setShowModal(false);
    } catch (err) {
      console.error("Booking error", err);
    } finally {
      setBookingId(null);
    }
  }

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const status = (apt.status || "Pending Review").toLowerCase();
      if (filter === "confirmed") return status.includes("confirm");
      if (filter === "pending") return status.includes("pending");
      if (filter === "completed") return status.includes("complete");
      return true;
    });
  }, [appointments, filter]);

  return (
    <div className="mx-auto max-w-6xl animate-fade-up">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-800 pb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-semibold mb-1">
            {isCounselor ? "Counselor Session Queue" : "Student Appointments"}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Counseling Appointments
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {isCounselor
              ? "Review incoming student appointment requests and track counseling sessions."
              : "Manage and book confidential counseling sessions with University guidance counselors."}
          </p>
        </div>

        {!isCounselor && (
          <button
            onClick={openBookingModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-cyan-500 hover:scale-[1.01] active:scale-[0.99] self-start sm:self-auto"
          >
            <span>📅</span>
            <span>Book New Appointment</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          ["all", "All Sessions"],
          ["pending", "Pending Review"],
          ["confirmed", "Confirmed"],
          ["completed", "Completed"],
        ].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              filter === val
                ? "bg-cyan-600 text-white shadow-sm"
                : "border border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-gray-800 bg-gray-900/60 p-8 text-gray-400 gap-3">
          <Spinner size={20} className="text-cyan-400" />
          <span>Loading appointment records...</span>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-900/40 p-12 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-800 text-2xl">
            📅
          </div>
          <h3 className="text-base font-semibold text-white">No Appointments Found</h3>
          <p className="mt-1 text-sm text-gray-400 max-w-md mx-auto">
            {isCounselor
              ? "There are currently no appointment requests matching this filter."
              : "You do not have any appointments scheduled in this category. Click 'Book New Appointment' to schedule a time slot."}
          </p>
          {!isCounselor && (
            <button
              onClick={openBookingModal}
              className="mt-5 rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-cyan-500 transition"
            >
              Book Counselor Session
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((apt) => {
            const status = apt.status || "Pending Review";
            const isConfirmed = status.toLowerCase().includes("confirm");
            const isPending = status.toLowerCase().includes("pending");

            return (
              <div
                key={apt.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-gray-800 bg-gray-900/90 p-5 transition hover:border-gray-700 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white text-base">
                      {apt.title || "Counseling Session"}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                        isConfirmed
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : isPending
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-gray-800 text-gray-300 border border-gray-700"
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                    <div>
                      {isCounselor ? "Student:" : "Counselor:"}{" "}
                      <span className="text-gray-200 font-medium">
                        {isCounselor ? (apt.studentName || "Student") : (apt.counselorName || "Assigned Counselor")}
                      </span>
                    </div>
                    {apt.studentEmail && (
                      <div>
                        Email: <span className="text-cyan-300 font-mono">{apt.studentEmail}</span>
                      </div>
                    )}
                    <div>
                      Time:{" "}
                      <span className="text-cyan-300 font-medium">
                        {safeFormatDate(apt.start || apt.date)}
                        {apt.end ? ` - ${safeFormatDate(apt.end)}` : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {isCounselor && (
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    {status !== "Confirmed" && (
                      <button
                        onClick={() => handleStatusUpdate(apt.id, "Confirmed")}
                        disabled={updatingId === apt.id}
                        className="rounded-xl bg-cyan-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 transition disabled:opacity-50"
                      >
                        {updatingId === apt.id ? "Updating…" : "Confirm"}
                      </button>
                    )}
                    {status !== "Completed" && (
                      <button
                        onClick={() => handleStatusUpdate(apt.id, "Completed")}
                        disabled={updatingId === apt.id}
                        className="rounded-xl border border-gray-700 bg-gray-800 px-3.5 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition disabled:opacity-50"
                      >
                        Mark Completed
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* BOOKING MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-up">
          <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Select Available Counselor Slot</h3>
                <p className="text-xs text-gray-400">Choose a confidential time slot</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>

            {loadingSlots ? (
              <div className="py-8 text-center text-gray-400 flex items-center justify-center gap-2">
                <Spinner /> Loading open counselor slots...
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="py-8 text-center text-gray-500 border border-dashed border-gray-800 rounded-xl p-4">
                No open counselor slots available right now. Please check back soon or visit the Guidance Office.
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {availableSlots.map((slot) => {
                  const startTime = safeFormatDate(slot.start || slot.date || slot.time);
                  const endTime = safeFormatDate(slot.end || slot.to);

                  return (
                    <div key={slot.id} className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-800/40 p-4">
                      <div>
                        <div className="text-sm font-medium text-white">
                          Counselor: {slot.counselorName || "Assigned Counselor"}
                        </div>
                        <div className="text-xs text-cyan-300 mt-0.5 font-medium">
                          {startTime} {endTime ? `to ${endTime}` : ""}
                        </div>
                      </div>
                      <button
                        onClick={() => handleBookSlot(slot)}
                        disabled={bookingId === slot.id}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
                      >
                        {bookingId === slot.id ? <Spinner /> : "Book Slot"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-5 flex justify-end pt-3 border-t border-gray-800">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-gray-700 px-4 py-2 text-xs font-medium text-gray-400 hover:bg-gray-800 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The appointment lifecycle, in one place. Every screen, the data layer and the tests read it from here, so "what
 * can happen to this session next?" has one answer. Diagram and rationale: docs/STATE_MACHINES.md.
 *
 *   pending                  → confirmed, rescheduled (counselor), declined (counselor), cancelled
 *   confirmed / rescheduled  → completed, rescheduled, cancelled   (rescheduling again keeps it rescheduled)
 *   completed, declined, cancelled: final
 *
 * Declined, cancelled and completed are final. The stored status is free text in Firestore, so `appointmentPhase`
 * reads it leniently and anything unknown is "other": shown as it is, offered no actions, and never blocked.
 * `firestore.rules` is still the real gate: staff may change the status, a student may only cancel their own.
 */
import type { AppointmentStatus } from "../types";

export type AppointmentPhase = "pending" | "confirmed" | "rescheduled" | "completed" | "declined" | "cancelled" | "other";
export type AppointmentAction = "confirm" | "reschedule" | "decline" | "complete" | "cancel";
export type AppointmentActor = "student" | "counselor";

/** The status string stored for each action. */
export const STATUS_FOR: Readonly<Record<AppointmentAction, AppointmentStatus>> = {
  confirm: "Confirmed",
  reschedule: "Rescheduled",
  decline: "Declined",
  complete: "Completed",
  cancel: "Cancelled",
};

/** The phase each action leads to. */
const PHASE_AFTER: Readonly<Record<AppointmentAction, AppointmentPhase>> = {
  confirm: "confirmed",
  reschedule: "rescheduled",
  decline: "declined",
  complete: "completed",
  cancel: "cancelled",
};

/** Which actions each role can take from each phase, in the order the buttons are shown. */
const ACTIONS: Readonly<Record<AppointmentActor, Readonly<Partial<Record<AppointmentPhase, readonly AppointmentAction[]>>>>> = {
  counselor: {
    pending: ["confirm", "reschedule", "decline"],
    confirmed: ["complete", "reschedule", "cancel"],
    rescheduled: ["complete", "reschedule", "cancel"],
  },
  student: {
    pending: ["cancel"],
    confirmed: ["cancel"],
    rescheduled: ["cancel"],
  },
};

/**
 * Reads a stored status. A missing status is a request nobody has answered yet. Matching is by word stem and
 * case-insensitive, as older rows were written by hand.
 */
export function appointmentPhase(status?: string | null): AppointmentPhase {
  const s = (status || "Pending Review").toLowerCase();
  if (s.includes("confirm")) return "confirmed";
  if (s.includes("pending")) return "pending";
  if (s.includes("reschedul")) return "rescheduled";
  if (s.includes("complet")) return "completed";
  if (s.includes("declin")) return "declined";
  if (s.includes("cancel")) return "cancelled";
  return "other";
}

/** What `actor` can do to a session in `phase`, in display order. Empty when nothing is left to do. */
export function actionsFor(phase: AppointmentPhase, actor: AppointmentActor): readonly AppointmentAction[] {
  return ACTIONS[actor][phase] ?? [];
}

/** True while the session can still happen: requested, confirmed or moved. */
export function isLive(phase: AppointmentPhase): boolean {
  return phase === "pending" || phase === "confirmed" || phase === "rescheduled";
}

/** True once a session is over for good: completed, declined or cancelled. */
export function isClosed(phase: AppointmentPhase): boolean {
  return phase === "completed" || phase === "declined" || phase === "cancelled";
}

/** True once a counselor has agreed to the time: the session shows in calendars and gets a reminder. */
export function isScheduled(phase: AppointmentPhase): boolean {
  return phase === "confirmed" || phase === "rescheduled";
}

/** True when the new status gives the booked availability slot back (declined or cancelled). */
export function releasesSlot(status: string): boolean {
  const phase = appointmentPhase(status);
  return phase === "declined" || phase === "cancelled";
}

/**
 * Whether a session that is now in `from` may be moved to the stored status `to`, by anyone. Used to refuse a
 * stale click, such as confirming a booking the student cancelled a moment ago. A session in an unknown
 * ("other") state, or a move to an unknown status, is never blocked.
 */
export function canMove(from: AppointmentPhase, to: string): boolean {
  const target = appointmentPhase(to);
  if (from === "other" || target === "other") return true;
  const reachable = new Set<AppointmentPhase>();
  for (const actor of ["counselor", "student"] as const) {
    for (const action of actionsFor(from, actor)) reachable.add(PHASE_AFTER[action]);
  }
  return reachable.has(target);
}

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  actionsFor,
  appointmentPhase,
  canMove,
  isLive,
  isScheduled,
  releasesSlot,
  STATUS_FOR,
  type AppointmentAction,
  type AppointmentPhase,
} from "./appointmentLifecycle";

const PHASES: AppointmentPhase[] = [
  "pending",
  "confirmed",
  "rescheduled",
  "completed",
  "declined",
  "cancelled",
  "other",
];

describe("appointmentPhase", () => {
  it.each([
    ["Pending Review", "pending"],
    ["Confirmed", "confirmed"],
    ["Rescheduled", "rescheduled"],
    ["Completed", "completed"],
    ["Declined", "declined"],
    ["Cancelled", "cancelled"],
    ["canceled by student", "cancelled"],
    ["Archived", "other"],
  ])("reads %j as %s", (status, phase) => {
    expect(appointmentPhase(status)).toBe(phase);
  });

  it("is case-insensitive, and a missing status is a request nobody has answered", () => {
    expect(appointmentPhase("CONFIRMED")).toBe("confirmed");
    expect(appointmentPhase(undefined)).toBe("pending");
    expect(appointmentPhase(null)).toBe("pending");
    expect(appointmentPhase("")).toBe("pending");
  });

  it("round-trips every status the app writes", () => {
    for (const action of Object.keys(STATUS_FOR) as AppointmentAction[]) {
      expect(appointmentPhase(STATUS_FOR[action])).not.toBe("other");
    }
  });
});

describe("actionsFor", () => {
  it("lets a counselor answer a request, and manage a scheduled session", () => {
    expect(actionsFor("pending", "counselor")).toEqual(["confirm", "reschedule", "decline"]);
    expect(actionsFor("confirmed", "counselor")).toEqual(["complete", "reschedule", "cancel"]);
    expect(actionsFor("rescheduled", "counselor")).toEqual(["complete", "reschedule", "cancel"]);
  });

  it("lets a student do one thing: cancel a session that is still live", () => {
    for (const phase of ["pending", "confirmed", "rescheduled"] as const) {
      expect(actionsFor(phase, "student")).toEqual(["cancel"]);
    }
  });

  it("offers nothing once a session is closed or unrecognised", () => {
    for (const phase of ["completed", "declined", "cancelled", "other"] as const) {
      expect(actionsFor(phase, "counselor")).toEqual([]);
      expect(actionsFor(phase, "student")).toEqual([]);
    }
  });

  it("a student can never confirm, decline, reschedule or complete (firestore.rules allows only Cancelled)", () => {
    for (const phase of PHASES) {
      for (const action of actionsFor(phase, "student")) expect(STATUS_FOR[action]).toBe("Cancelled");
    }
  });

  it("agrees with firestore.rules: students may only set Cancelled", () => {
    const rules = readFileSync(new URL("../../../firestore.rules", import.meta.url), "utf8");
    expect(rules).toContain("request.resource.data.status == 'Cancelled'");
    expect(rules).toContain("'Pending Review'");
  });
});

describe("live and scheduled", () => {
  it("separates sessions that can still happen from closed ones", () => {
    expect(PHASES.filter(isLive)).toEqual(["pending", "confirmed", "rescheduled"]);
    expect(PHASES.filter(isScheduled)).toEqual(["confirmed", "rescheduled"]);
  });
});

describe("releasesSlot", () => {
  it("frees the slot only for declined and cancelled", () => {
    expect(releasesSlot("Declined")).toBe(true);
    expect(releasesSlot("Cancelled")).toBe(true);
    for (const s of ["Confirmed", "Rescheduled", "Completed", "Pending Review"]) expect(releasesSlot(s)).toBe(false);
  });
});

describe("canMove", () => {
  it("allows each move the screens offer", () => {
    expect(canMove("pending", "Confirmed")).toBe(true);
    expect(canMove("pending", "Declined")).toBe(true);
    expect(canMove("pending", "Rescheduled")).toBe(true);
    expect(canMove("pending", "Cancelled")).toBe(true);
    expect(canMove("confirmed", "Completed")).toBe(true);
    expect(canMove("confirmed", "Cancelled")).toBe(true);
    expect(canMove("rescheduled", "Rescheduled")).toBe(true);
  });

  it("refuses to act on a closed session, such as confirming a booking the student already cancelled", () => {
    for (const closed of ["completed", "declined", "cancelled"] as const) {
      for (const to of Object.values(STATUS_FOR)) expect(canMove(closed, to)).toBe(false);
    }
  });

  it("refuses moves the screens never offer", () => {
    expect(canMove("confirmed", "Confirmed")).toBe(false);
    expect(canMove("confirmed", "Declined")).toBe(false);
    expect(canMove("rescheduled", "Confirmed")).toBe(false);
    expect(canMove("pending", "Completed")).toBe(false);
  });

  it("never blocks unknown data", () => {
    expect(canMove("other", "Confirmed")).toBe(true);
    expect(canMove("pending", "Archived")).toBe(true);
  });
});

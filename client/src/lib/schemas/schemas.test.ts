import { describe, it, expect } from "vitest";
import {
  appointmentActionSchema,
  bookingSlotSchema,
  caseReviewSchema,
  chatMessageSchema,
  checkInSchema,
  counselorAssignmentSchema,
  goalsSchema,
  loginSchema,
  profileSchema,
  signupSchema,
  timeWindowSchema,
} from ".";
import { fieldErrorsOf, validate } from "../validate";

describe("validate helper", () => {
  it("returns parsed data on success and the standard validation error on failure", () => {
    const ok = validate(loginSchema, { email: " a@b.co ", password: "x" });
    expect(ok).toEqual({ ok: true, data: { email: "a@b.co", password: "x" } });

    const bad = validate(loginSchema, {});
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.error.code).toBe("validation");
      expect(bad.error.userMessage).toBe("Enter your email.");
      expect(bad.error.fieldErrors).toEqual({ email: "Enter your email.", password: "Enter your password." });
    }
  });

  it("keeps only the first message per field", () => {
    expect(fieldErrorsOf(signupSchema, { name: "A", email: "", password: "" }).email).toBe("Enter your school email.");
  });
});

describe("checkInSchema", () => {
  const seven = [0, 1, 2, 3, 0, 1, 2];
  it("accepts exactly seven answers from 0 to 3", () => {
    expect(validate(checkInSchema, { answers: seven }).ok).toBe(true);
  });
  it.each([
    ["too few answers", { answers: [0, 1] }],
    ["too many answers", { answers: [...seven, 1] }],
    ["an unanswered question (null)", { answers: [0, 1, 2, null, 0, 1, 2] }],
    ["a value above 3", { answers: [0, 1, 2, 4, 0, 1, 2] }],
    ["a negative value", { answers: [0, 1, 2, -1, 0, 1, 2] }],
    ["a fraction", { answers: [0, 1, 2, 1.5, 0, 1, 2] }],
    ["a string", { answers: [0, 1, 2, "2", 0, 1, 2] }],
    ["no answers key", {}],
  ])("rejects %s", (_label, input) => {
    expect(validate(checkInSchema, input).ok).toBe(false);
  });
});

describe("bookingSlotSchema", () => {
  const slot = {
    id: "s1",
    counselorId: "c1",
    counselorName: "Dr. Cruz",
    start: "2026-10-05T09:00",
    end: "2026-10-05T10:00",
  };
  it("accepts a complete slot", () => {
    expect(validate(bookingSlotSchema, slot).ok).toBe(true);
  });
  it("needs an id, a counselor, readable times and an end after the start", () => {
    expect(fieldErrorsOf(bookingSlotSchema, { ...slot, id: "" })).toHaveProperty("id");
    expect(fieldErrorsOf(bookingSlotSchema, { ...slot, counselorId: undefined })).toHaveProperty("counselorId");
    expect(fieldErrorsOf(bookingSlotSchema, { ...slot, start: "nope" })).toHaveProperty("start");
    expect(fieldErrorsOf(bookingSlotSchema, { ...slot, end: "2026-10-05T08:00" })).toEqual({
      end: "The end time must be after the start time.",
    });
  });
});

describe("timeWindowSchema", () => {
  const now = new Date("2026-10-02T08:00:00");
  const schema = timeWindowSchema(now);
  it("is valid when in the future and ordered", () => {
    expect(validate(schema, { start: "2026-10-03T09:00", end: "2026-10-03T10:00" }).ok).toBe(true);
  });
  it("reports a past start and a reversed end separately", () => {
    expect(fieldErrorsOf(schema, { start: "2026-10-01T09:00", end: "2026-10-01T10:00" })).toEqual({
      start: "The start time is in the past.",
    });
    expect(fieldErrorsOf(schema, { start: "2026-10-03T10:00", end: "2026-10-03T09:00" })).toEqual({
      end: "The end time must be after the start time.",
    });
  });
});

describe("appointmentActionSchema", () => {
  it("requires a reason to decline but not to cancel", () => {
    expect(fieldErrorsOf(appointmentActionSchema, { type: "decline", reason: "  " })).toHaveProperty("reason");
    expect(validate(appointmentActionSchema, { type: "decline", reason: " Fully booked " })).toEqual({
      ok: true,
      data: { type: "decline", reason: "Fully booked" },
    });
    expect(validate(appointmentActionSchema, { type: "cancel", reason: "" }).ok).toBe(true);
  });
  it("needs a start time to reschedule and caps reasons at 500 characters", () => {
    expect(
      fieldErrorsOf(appointmentActionSchema, { type: "reschedule", reason: "", start: "", end: "" }),
    ).toHaveProperty("start");
    expect(fieldErrorsOf(appointmentActionSchema, { type: "cancel", reason: "x".repeat(501) })).toHaveProperty(
      "reason",
    );
  });
  it("rejects an unknown action type", () => {
    expect(validate(appointmentActionSchema, { type: "delete", reason: "x" }).ok).toBe(false);
  });
});

describe("counselor forms", () => {
  it("case review needs an id and a known status, and caps notes at 2000 characters", () => {
    expect(validate(caseReviewSchema, { id: "c1", status: "reviewed", counselorNotes: "Called." }).ok).toBe(true);
    expect(fieldErrorsOf(caseReviewSchema, { id: "", status: "open" })).toHaveProperty("id");
    expect(fieldErrorsOf(caseReviewSchema, { id: "c1", status: "closed" })).toHaveProperty("status");
    expect(
      fieldErrorsOf(caseReviewSchema, { id: "c1", status: "open", counselorNotes: "x".repeat(2001) }),
    ).toHaveProperty("counselorNotes");
  });
  it("assignment allows clearing the counselor with null", () => {
    expect(validate(counselorAssignmentSchema, { studentId: "s1", counselorId: null, counselorName: null }).ok).toBe(
      true,
    );
    expect(validate(counselorAssignmentSchema, { studentId: "", counselorId: "c1", counselorName: "A" }).ok).toBe(
      false,
    );
  });
});

describe("profile and goals", () => {
  it("profile trims, requires a name, and allows a blank phone", () => {
    expect(validate(profileSchema, { name: "  Ana  ", phone: "", bio: "" })).toEqual({
      ok: true,
      data: { name: "Ana", phone: "", bio: "" },
    });
    expect(fieldErrorsOf(profileSchema, { name: "", phone: "abc", bio: "" })).toEqual({
      name: "Your name cannot be empty.",
      phone: "Enter a valid phone number, or leave this blank.",
    });
  });
  it("goals are capped at five", () => {
    expect(validate(goalsSchema, ["a", "b", "c", "d", "e"]).ok).toBe(true);
    expect(validate(goalsSchema, ["a", "b", "c", "d", "e", "f"]).ok).toBe(false);
  });
});

describe("chatMessageSchema", () => {
  it("trims the text, rejects blanks and caps the length", () => {
    expect(validate(chatMessageSchema, { studentId: "s", text: "  hi  " })).toMatchObject({
      ok: true,
      data: { text: "hi" },
    });
    expect(validate(chatMessageSchema, { studentId: "s", text: "   " }).ok).toBe(false);
    expect(validate(chatMessageSchema, { studentId: "s", text: "x".repeat(2001) }).ok).toBe(false);
    expect(validate(chatMessageSchema, { studentId: "", text: "hi" }).ok).toBe(false);
  });
});

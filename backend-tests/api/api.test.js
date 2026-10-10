// Runs the real client/src/lib/api.ts against the Firestore emulator with the real
// firestore.rules. Only the Firebase *handle* and the signed-in user are swapped per role.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { doc, getDoc } from "firebase/firestore";
import { createEnv, seedUsers, seed, USERS, slot, assessment, appointment, message } from "../helpers/env.js";

const session = vi.hoisted(() => ({ db: null, user: null }));
vi.mock("../../client/src/lib/firebase.ts", () => ({
  get db() { return session.db; },
  get auth() { return {}; },
  provider: {},
}));
vi.mock("firebase/auth", () => ({ getAuth: () => ({ currentUser: session.user }) }));

const api = await import("../../client/src/lib/api.ts");

let env;
beforeAll(async () => { env = await createEnv(); });
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await seedUsers(env);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

// Act as one of the seeded principals.
function login(key) {
  const { uid, data } = USERS[key];
  session.db = env.authenticatedContext(uid).firestore();
  session.user = { uid, displayName: data.name, email: data.email };
}
const logout = () => { session.db = env.unauthenticatedContext().firestore(); session.user = null; };
// Read a document bypassing rules, to verify what was actually stored.
const raw = async (path) => {
  let out = null;
  await env.withSecurityRulesDisabled(async (c) => {
    const s = await getDoc(doc(c.firestore(), path));
    out = s.exists() ? s.data() : null;
  });
  return out;
};
const denied = (p) => expect(p).rejects.toMatchObject({ code: "permission-denied" });

const questions = [
  { id: "q1", text: "Sleep" }, { id: "q2", text: "Mood" }, { id: "q3", text: "Stress" },
  { id: "q4", text: "Focus" }, { id: "q5", text: "Energy" }, { id: "q6", text: "Worry" },
  { id: "q7", text: "Safety", isCrisisItem: true },
];

describe("assessments", () => {
  it("submitResponse -> 201-style result with id and full shape (low risk)", async () => {
    login("student");
    const r = await api.submitResponse([0, 1, 0, 1, 0, 0, 0], { questions });
    expect(r).toMatchObject({
      id: expect.any(String), studentId: "stu1", studentName: "Ana Student", studentEmail: "ana@usa.edu.ph",
      total: 2, maxScore: 21, riskLevel: "low", flaggedForImmediateReview: false, status: "open", counselorNotes: "",
    });
    expect(r.questionSummary).toHaveLength(7);
    expect(r.questionSummary[6]).toEqual({ id: "q7", text: "Safety", score: 0, isCrisisItem: true });
    expect(Date.parse(r.createdAt)).not.toBeNaN();
    expect(await raw(`assessments/${r.id}`)).toMatchObject({ studentId: "stu1", total: 2 });
  });

  it("submitResponse flags a crisis answer as high risk even with a low total", async () => {
    login("student");
    const r = await api.submitResponse([0, 0, 0, 0, 0, 0, 1], { questions });
    expect(r).toMatchObject({ riskLevel: "high", flaggedForImmediateReview: true, total: 1 });
  });

  it("submitResponse honours flaggedForImmediateReview from the caller", async () => {
    login("student");
    expect((await api.submitResponse([0], { questions: [{ id: "q1", text: "Sleep" }], flaggedForImmediateReview: true })).riskLevel).toBe("high");
  });

  it("submitResponse as a signed-out user -> permission-denied", async () => {
    logout();
    await denied(api.submitResponse([0], { questions: [{ id: "q1", text: "Sleep" }] }));
  });

  it("getMyAssessments returns only the caller's documents", async () => {
    await seed(env, "assessments/a1", assessment());
    await seed(env, "assessments/a2", assessment({ studentId: "stu2" }));
    login("student");
    const list = await api.getMyAssessments();
    expect(list.map((a) => a.id)).toEqual(["a1"]);
    expect(list[0]).toMatchObject({ studentId: "stu1", status: "open" });
  });

  it("getMyAssessments with no user -> []", async () => {
    logout();
    expect(await api.getMyAssessments()).toEqual([]);
  });

  it("getAssessments (counselor) returns all docs and fills placeholder names from profiles", async () => {
    await seed(env, "assessments/a1", assessment({ studentName: "Student", studentEmail: "No email" }));
    await seed(env, "assessments/a2", assessment({ studentId: "stu2", studentName: "Ben Real", studentEmail: "ben@x.ph" }));
    login("counselor");
    const list = await api.getAssessments();
    const byId = Object.fromEntries(list.map((a) => [a.id, a]));
    expect(list).toHaveLength(2);
    expect(byId.a1).toMatchObject({ studentName: "Ana Student", studentEmail: "ana@usa.edu.ph" });
    expect(byId.a2).toMatchObject({ studentName: "Ben Real", studentEmail: "ben@x.ph" });
  });

  it("getAssessments as a student -> permission-denied", async () => {
    login("student");
    await denied(api.getAssessments());
  });

  it("updateAssessmentStatus (counselor) persists status, notes and reviewedAt", async () => {
    await seed(env, "assessments/a1", assessment());
    login("counselor");
    await api.updateAssessmentStatus("a1", "reviewed", "called student");
    expect(await raw("assessments/a1")).toMatchObject({ status: "reviewed", counselorNotes: "called student", reviewedAt: expect.any(String) });
  });

  it("updateAssessmentStatus leaves notes alone when omitted", async () => {
    await seed(env, "assessments/a1", assessment({ counselorNotes: "keep" }));
    login("admin");
    await api.updateAssessmentStatus("a1", "escalated");
    expect((await raw("assessments/a1")).counselorNotes).toBe("keep");
  });

  it("updateAssessmentStatus as a student -> permission-denied", async () => {
    await seed(env, "assessments/a1", assessment());
    login("student");
    await denied(api.updateAssessmentStatus("a1", "reviewed"));
  });
});

describe("appointments and availability", () => {
  it("addAvailability (counselor) creates an unbooked slot with the expected shape", async () => {
    login("counselor");
    const ref = await api.addAvailability("2026-10-05T09:00:00.000Z", "2026-10-05T10:00:00.000Z");
    expect(await raw(`availability/${ref.id}`)).toMatchObject({
      counselorId: "cou1", counselorName: "Dr. Cruz", start: "2026-10-05T09:00:00.000Z",
      end: "2026-10-05T10:00:00.000Z", isBooked: false,
    });
  });

  it("addAvailability as a student -> permission-denied", async () => {
    login("student");
    await denied(api.addAvailability("a", "b"));
  });

  it("getAvailability (student) lists all slots with ids; getMyAvailability filters to the counselor", async () => {
    await seed(env, "availability/s1", slot());
    await seed(env, "availability/s2", slot({ counselorId: "adm1" }));
    login("student");
    expect((await api.getAvailability()).map((s) => s.id).sort()).toEqual(["s1", "s2"]);
    login("counselor");
    expect((await api.getMyAvailability()).map((s) => s.id)).toEqual(["s1"]);
  });

  it("removeAvailability: owner ok, other counselor denied", async () => {
    await seed(env, "availability/s1", slot());
    login("admin");
    await denied(api.removeAvailability("s1"));
    login("counselor");
    await api.removeAvailability("s1");
    expect(await raw("availability/s1")).toBeNull();
  });

  it("bookAppointment(slot) books the slot and creates a Pending Review appointment", async () => {
    await seed(env, "availability/s1", slot());
    login("student");
    const ref = await api.bookAppointment({ id: "s1", ...slot() });
    expect(await raw("availability/s1")).toMatchObject({ isBooked: true });
    expect(await raw(`appointments/${ref.id}`)).toMatchObject({
      studentId: "stu1", studentName: "Ana Student", studentEmail: "ana@usa.edu.ph", slotId: "s1",
      counselorId: "cou1", counselorName: "Dr. Cruz", title: "Session with Dr. Cruz", status: "Pending Review",
    });
  });

  it("bookAppointment without a slot creates a generic request dated tomorrow", async () => {
    login("student");
    const ref = await api.bookAppointment();
    const a = await raw(`appointments/${ref.id}`);
    expect(a).toMatchObject({ studentId: "stu1", slotId: null, title: "Counseling Session", status: "Pending Review" });
    expect(Date.parse(a.date)).toBeGreaterThan(Date.now());
  });

  it("bookAppointment signed-out is rejected as unauthenticated before any write is attempted", async () => {
    logout();
    await expect(api.bookAppointment({ counselorId: "cou1", start: "a", end: "b" })).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("getAppointments returns only the caller's; no user -> []", async () => {
    await seed(env, "appointments/ap1", appointment());
    await seed(env, "appointments/ap2", appointment({ studentId: "stu2" }));
    login("student");
    expect((await api.getAppointments()).map((a) => a.id)).toEqual(["ap1"]);
    logout();
    expect(await api.getAppointments()).toEqual([]);
  });

  it("getAllAppointments (counselor) returns everything with names filled in; student denied", async () => {
    await seed(env, "appointments/ap1", appointment({ studentName: "Student", studentEmail: "" }));
    await seed(env, "appointments/ap2", appointment({ studentId: "stu2", studentName: "Ben Student", studentEmail: "ben@usa.edu.ph" }));
    login("counselor");
    const list = await api.getAllAppointments();
    expect(list).toHaveLength(2);
    expect(list.find((a) => a.id === "ap1")).toMatchObject({ studentName: "Ana Student", studentEmail: "ana@usa.edu.ph" });
    login("student");
    await denied(api.getAllAppointments());
  });

  it("updateAppointmentStatus Confirmed (counselor) stamps updatedAt", async () => {
    await seed(env, "appointments/ap1", appointment());
    login("counselor");
    await api.updateAppointmentStatus("ap1", "Confirmed");
    expect(await raw("appointments/ap1")).toMatchObject({ status: "Confirmed", updatedAt: expect.any(String) });
  });

  it("updateAppointmentStatus Declined frees the linked slot", async () => {
    await seed(env, "availability/slot1", slot({ isBooked: true }));
    await seed(env, "appointments/ap1", appointment());
    login("counselor");
    await api.updateAppointmentStatus("ap1", "Declined", { slotId: "slot1" });
    expect((await raw("availability/slot1")).isBooked).toBe(false);
    expect((await raw("appointments/ap1")).status).toBe("Declined");
  });

  it("student cancels own appointment, slot is freed, reason is stored", async () => {
    await seed(env, "availability/slot1", slot({ isBooked: true }));
    await seed(env, "appointments/ap1", appointment());
    login("student");
    await api.updateAppointmentStatus("ap1", "Cancelled", { slotId: "slot1", cancellationReason: "sick", cancelledBy: "student" });
    expect(await raw("appointments/ap1")).toMatchObject({ status: "Cancelled", cancellationReason: "sick", cancelledBy: "student" });
    expect((await raw("availability/slot1")).isBooked).toBe(false);
  });

  it("student cannot confirm their own appointment", async () => {
    await seed(env, "appointments/ap1", appointment());
    login("student");
    await denied(api.updateAppointmentStatus("ap1", "Confirmed"));
  });
});

describe("user profiles, admin and assignment", () => {
  it("getUserSettings returns the profile with its id; unknown uid -> null; no user -> null", async () => {
    login("student");
    expect(await api.getUserSettings()).toMatchObject({ id: "stu1", name: "Ana Student", role: "student", approved: true, active: true });
    login("admin");
    expect(await api.getUserSettings("nobody")).toBeNull();
    logout();
    expect(await api.getUserSettings()).toBeNull();
  });

  it("saveUserSettings updates allowed fields", async () => {
    login("student");
    await api.saveUserSettings(undefined, { name: "Ana B." });
    expect((await raw("users/stu1")).name).toBe("Ana B.");
  });

  it("saveUserSettings rejects privilege escalation", async () => {
    login("student");
    await denied(api.saveUserSettings("stu1", { role: "admin" }));
    expect((await raw("users/stu1")).role).toBe("student");
  });

  it("saveUserSettings with no user throws a plain Error", async () => {
    logout();
    await expect(api.saveUserSettings(undefined, { name: "x" })).rejects.toThrow("No authenticated user");
  });

  it("getAdminUsers (admin) returns every profile with id", async () => {
    login("admin");
    const users = await api.getAdminUsers();
    expect(users).toHaveLength(Object.keys(USERS).length);
    expect(users.find((u) => u.id === "cou1")).toMatchObject({ role: "counselor", approved: true });
  });

  it("getAdminUsers as a student -> permission-denied", async () => {
    login("student");
    await denied(api.getAdminUsers());
  });

  it("approve / reject / deactivate / reactivate (admin) persist", async () => {
    login("admin");
    await api.approveCounselor("cou2");
    expect((await raw("users/cou2")).approved).toBe(true);
    await api.rejectCounselor("cou2");
    expect((await raw("users/cou2")).approved).toBe(false);
    await api.deactivateUser("stu1");
    expect((await raw("users/stu1")).active).toBe(false);
    await api.reactivateUser("stu1");
    expect((await raw("users/stu1")).active).toBe(true);
  });

  it("counselor cannot approve counselors", async () => {
    login("counselor");
    await denied(api.approveCounselor("cou2"));
  });

  it("assignCounselorToStudent assigns and clears", async () => {
    login("counselor");
    await api.assignCounselorToStudent("stu1", "cou1", "Dr. Cruz");
    expect(await raw("users/stu1")).toMatchObject({ assignedCounselorId: "cou1", assignedCounselorName: "Dr. Cruz", assignedAt: expect.any(String) });
    await api.assignCounselorToStudent("stu1", null);
    expect(await raw("users/stu1")).toMatchObject({ assignedCounselorId: null, assignedCounselorName: null, assignedAt: null });
  });

  it("assignCounselorToStudent as a student -> permission-denied", async () => {
    login("student");
    await denied(api.assignCounselorToStudent("stu1", "stu1", "me"));
  });
});

describe("getMyMessages (data download)", () => {
  it("returns the caller's own thread, oldest first, and never another student's", async () => {
    await seed(env, "messages/m2", message({ text: "second", timestamp: "2026-10-01T00:00:02.000Z" }));
    await seed(env, "messages/m1", message({ text: "first", timestamp: "2026-10-01T00:00:01.000Z" }));
    await seed(env, "messages/mx", message({ studentId: "stu2", senderId: "stu2", text: "someone else" }));
    login("student");
    const mine = await api.getMyMessages();
    expect(mine.map((m) => m.text)).toEqual(["first", "second"]);
  });
  it("signed out -> []", async () => {
    logout();
    expect(await api.getMyMessages()).toEqual([]);
  });
  it("a counselor with no thread of their own gets an empty list, not an error", async () => {
    await seed(env, "messages/m1", message());
    login("counselor");
    expect(await api.getMyMessages()).toEqual([]);
  });
});

describe("confidential messages", () => {
  it("sendStudentMessage returns id + trimmed payload and persists it", async () => {
    login("student");
    const m = await api.sendStudentMessage({ studentId: "stu1", senderId: "stu1", senderName: "Ana Student", senderRole: "student", text: "  hi  " });
    expect(m).toMatchObject({ id: expect.any(String), studentId: "stu1", senderId: "stu1", senderRole: "student", text: "hi" });
    expect(await raw(`messages/${m.id}`)).toMatchObject({ text: "hi" });
  });

  it("sendStudentMessage returns null (no write) for blank text or missing studentId", async () => {
    login("student");
    expect(await api.sendStudentMessage({ studentId: "stu1", text: "   " })).toBeNull();
    expect(await api.sendStudentMessage({ studentId: "", text: "hi" })).toBeNull();
  });

  it("sendStudentMessage defaults senderId to the signed-in user and name by role", async () => {
    login("counselor");
    const m = await api.sendStudentMessage({ studentId: "stu1", senderRole: "counselor", text: "hello" });
    expect(m).toMatchObject({ senderId: "cou1", senderName: "Counselor", senderRole: "counselor" });
  });

  it("sendStudentMessage into another student's thread -> permission-denied", async () => {
    login("student");
    await denied(api.sendStudentMessage({ studentId: "stu2", senderId: "stu1", text: "hi" }));
  });

  it("listenToStudentMessages streams a thread sorted by timestamp and returns an unsubscribe fn", async () => {
    await seed(env, "messages/m2", message({ text: "second", timestamp: "2026-10-01T00:00:02.000Z" }));
    await seed(env, "messages/m1", message({ text: "first", timestamp: "2026-10-01T00:00:01.000Z" }));
    await seed(env, "messages/mx", message({ studentId: "stu2", text: "other thread" }));
    login("student");
    const received = await new Promise((resolve, reject) => {
      const unsub = api.listenToStudentMessages("stu1", (msgs) => { unsub(); resolve(msgs); }, reject);
    });
    expect(received.map((m) => m.text)).toEqual(["first", "second"]);
    expect(received[0]).toHaveProperty("id");
  });

  it("listenToStudentMessages reports permission-denied via onError for someone else's thread", async () => {
    login("student");
    const err = await new Promise((resolve) => {
      api.listenToStudentMessages("stu2", () => resolve(null), resolve);
    });
    expect(err).toMatchObject({ code: "permission-denied" });
  });

  it("listenToStudentMessages with no studentId returns a harmless no-op", () => {
    login("student");
    const unsub = api.listenToStudentMessages("", () => {});
    expect(typeof unsub).toBe("function");
    expect(unsub()).toBeUndefined();
  });
});

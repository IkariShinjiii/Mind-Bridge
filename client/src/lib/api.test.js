import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Unit tests: the Firestore SDK is replaced with recording fakes, so these run offline.
// Rules and real persistence are covered separately by backend-tests/ (Firestore emulator).
const h = vi.hoisted(() => ({ user: null }));

vi.mock("firebase/firestore", () => ({
  collection: (_db, name) => ({ kind: "collection", name }),
  doc: (_db, col, id) => ({ kind: "doc", col, id }),
  where: (field, op, value) => ({ field, op, value }),
  query: (c, ...clauses) => ({ kind: "query", name: c.name, clauses }),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(),
}));
vi.mock("firebase/auth", () => ({ getAuth: () => ({ currentUser: h.user }) }));
vi.mock("./firebase", () => ({ db: { fake: true } }));

const fs = await import("firebase/firestore");
const api = await import("./api");

const NOW = new Date("2026-10-02T08:00:00.000Z");
const snap = (rows) => {
  const docs = rows.map(([id, data]) => ({ id, data: () => data }));
  return { docs, forEach: (fn) => docs.forEach(fn) };
};
const signIn = (user) => {
  h.user = user;
};
const ana = { uid: "stu1", displayName: "Ana Student", email: "ana@usa.edu.ph" };
const lastWrite = (fn) => fn.mock.calls.at(-1);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.clearAllMocks();
  fs.getDocs.mockResolvedValue(snap([]));
  fs.getDoc.mockResolvedValue({ exists: () => false });
  fs.addDoc.mockResolvedValue({ id: "new1" });
  fs.updateDoc.mockResolvedValue(undefined);
  fs.deleteDoc.mockResolvedValue(undefined);
  signIn(ana);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("admin user management", () => {
  it("getAdminUsers maps documents to { id, ...data }", async () => {
    fs.getDocs.mockResolvedValue(
      snap([
        ["u1", { name: "A" }],
        ["u2", { name: "B" }],
      ]),
    );
    expect(await api.getAdminUsers()).toEqual([
      { id: "u1", name: "A" },
      { id: "u2", name: "B" },
    ]);
  });

  // KNOWN ISSUE: `{ id: doc.id, ...doc.data() }` lets a stored `id` field replace the real document id
  // (every list function in api.js uses this pattern). Fix by spreading first: `{ ...data, id }`.
  // it.fails passes while the bug exists and turns red once it is fixed - then change it to `it`.
  it.fails("a stored `id` field must not override the document id", async () => {
    fs.getDocs.mockResolvedValue(snap([["u2", { name: "B", id: "ignored" }]]));
    expect(await api.getAdminUsers()).toEqual([{ id: "u2", name: "B" }]);
  });

  it("getAdminUsers returns [] for an empty collection and propagates read errors", async () => {
    expect(await api.getAdminUsers()).toEqual([]);
    fs.getDocs.mockRejectedValue(Object.assign(new Error("denied"), { code: "permission-denied" }));
    await expect(api.getAdminUsers()).rejects.toMatchObject({ code: "permission-denied" });
  });

  it.each([
    ["approveCounselor", { approved: true }],
    ["rejectCounselor", { approved: false }],
    ["deactivateUser", { active: false }],
    ["reactivateUser", { active: true }],
  ])("%s writes %j to users/{id} and nothing else", async (fn, patch) => {
    await api[fn]("u9");
    expect(fs.updateDoc).toHaveBeenCalledTimes(1);
    expect(lastWrite(fs.updateDoc)).toEqual([{ kind: "doc", col: "users", id: "u9" }, patch]);
  });

  it("status changes surface write errors to the caller", async () => {
    fs.updateDoc.mockRejectedValue(new Error("offline"));
    await expect(api.approveCounselor("u9")).rejects.toThrow("offline");
  });
});

describe("submitResponse", () => {
  const qs = [{ id: "a", text: "Sleep" }, { text: "Mood" }, { id: "c", text: "Safety", isCrisisItem: true }];

  it("stores a scored, open assessment for the signed-in student and returns it with its id", async () => {
    const r = await api.submitResponse([1, 2, 0], { questions: qs });
    expect(lastWrite(fs.addDoc)[0]).toEqual({ kind: "collection", name: "assessments" });
    expect(r).toMatchObject({
      id: "new1",
      studentId: "stu1",
      studentName: "Ana Student",
      studentEmail: "ana@usa.edu.ph",
      total: 3,
      maxScore: 9,
      riskLevel: "medium",
      flaggedForImmediateReview: false,
      status: "open",
      counselorNotes: "",
      createdAt: NOW.toISOString(),
      answers: [1, 2, 0],
    });
    const { id, ...stored } = r;
    expect(lastWrite(fs.addDoc)[1]).toEqual(stored); // returned object is exactly what was written, plus the id
  });

  it("builds questionSummary: generated ids, null for unanswered, boolean crisis flag", async () => {
    const r = await api.submitResponse([1], { questions: qs });
    expect(r.questionSummary).toEqual([
      { id: "a", text: "Sleep", score: 1, isCrisisItem: false },
      { id: "q2", text: "Mood", score: null, isCrisisItem: false },
      { id: "c", text: "Safety", score: null, isCrisisItem: true },
    ]);
  });

  it("a crisis answer forces high risk and the immediate-review flag", async () => {
    const r = await api.submitResponse([0, 0, 1], { questions: qs });
    expect(r).toMatchObject({ riskLevel: "high", flaggedForImmediateReview: true, total: 1 });
  });

  it("the caller can force high risk / review even when scoring says low", async () => {
    const r = await api.submitResponse([0, 0, 0], { questions: qs, flaggedForImmediateReview: true });
    expect(r).toMatchObject({ riskLevel: "high", flaggedForImmediateReview: true });
  });

  it("works with no options: scores from answers, empty questionSummary", async () => {
    const r = await api.submitResponse([3, 3]);
    expect(r).toMatchObject({ total: 6, maxScore: 6, riskLevel: "high", questionSummary: [] });
  });

  it("an empty answer list scores zero without throwing", async () => {
    expect(await api.submitResponse([], { questions: [] })).toMatchObject({ total: 0, maxScore: 0, riskLevel: "high" });
    // 0 >= 0 * 0.6 is true, so an empty submission is classed "high". Documented edge case.
  });

  it("falls back to the email prefix, then to anonymous defaults, when profile data is missing", async () => {
    signIn({ uid: "u", email: "kim@usa.edu.ph" });
    expect(await api.submitResponse([0], { questions: [{ text: "x" }] })).toMatchObject({ studentName: "kim" });
    signIn(null);
    expect(await api.submitResponse([0], { questions: [{ text: "x" }] })).toMatchObject({
      studentId: "anonymous",
      studentName: "Student",
      studentEmail: "No email",
    });
  });

  it("does not mutate the answers array", async () => {
    const answers = [1, null, 2];
    await api.submitResponse(answers, { questions: qs });
    expect(answers).toEqual([1, null, 2]);
  });

  it("propagates a failed write", async () => {
    fs.addDoc.mockRejectedValue(new Error("quota"));
    await expect(api.submitResponse([0], { questions: [{ text: "x" }] })).rejects.toThrow("quota");
  });
});

describe("getAssessments (staff list with name enrichment)", () => {
  const profiles = snap([["stu1", { name: "Ana Real", email: "ana@usa.edu.ph" }]]);
  const run = async (assessments, users = profiles) => {
    fs.getDocs.mockResolvedValueOnce(snap(assessments)).mockResolvedValueOnce(users);
    return api.getAssessments();
  };

  it.each(["Unknown", "Student", "", undefined])("replaces placeholder name %j with the profile name", async (name) => {
    const [a] = await run([["a1", { studentId: "stu1", studentName: name, studentEmail: "x@y.z" }]]);
    expect(a.studentName).toBe("Ana Real");
  });

  it.each(["No email", "No email provided", "", undefined])(
    "replaces placeholder email %j with the profile email",
    async (email) => {
      const [a] = await run([["a1", { studentId: "stu1", studentName: "N", studentEmail: email }]]);
      expect(a.studentEmail).toBe("ana@usa.edu.ph");
    },
  );

  it("keeps real stored values over the profile", async () => {
    const [a] = await run([["a1", { studentId: "stu1", studentName: "Typed Name", studentEmail: "typed@x.ph" }]]);
    expect(a).toMatchObject({ id: "a1", studentName: "Typed Name", studentEmail: "typed@x.ph" });
  });

  it("uses safe defaults when there is no matching profile or no studentId", async () => {
    const out = await run([
      ["a1", { studentId: "ghost", studentName: "Student", studentEmail: "No email" }],
      ["a2", { studentName: "Unknown" }],
    ]);
    expect(out.map((a) => [a.studentName, a.studentEmail])).toEqual([
      ["Student", "No email"], // stored placeholder is kept when nothing better exists
      ["Unknown", "Institutional email"],
    ]);
  });

  it("returns the raw assessments (and warns) when the profile lookup fails", async () => {
    fs.getDocs
      .mockResolvedValueOnce(snap([["a1", { studentName: "Student" }]]))
      .mockRejectedValueOnce(new Error("denied"));
    expect(await api.getAssessments()).toEqual([{ id: "a1", studentName: "Student" }]);
    expect(console.warn).toHaveBeenCalled();
  });

  it("propagates a failure of the main assessments read", async () => {
    fs.getDocs.mockRejectedValueOnce(new Error("denied"));
    await expect(api.getAssessments()).rejects.toThrow("denied");
  });
});

describe("getMyAssessments / getAppointments / getMyAvailability", () => {
  it.each([
    ["getMyAssessments", "assessments", "studentId"],
    ["getAppointments", "appointments", "studentId"],
    ["getMyAvailability", "availability", "counselorId"],
  ])("%s filters %s by %s == uid and adds ids", async (fn, col, field) => {
    fs.getDocs.mockResolvedValue(snap([["x1", { v: 1 }]]));
    expect(await api[fn]()).toEqual([{ id: "x1", v: 1 }]);
    expect(lastWrite(fs.getDocs)[0]).toEqual({
      kind: "query",
      name: col,
      clauses: [{ field, op: "==", value: "stu1" }],
    });
  });

  it.each(["getMyAssessments", "getAppointments", "getMyAvailability"])(
    "%s returns [] without querying when signed out",
    async (fn) => {
      signIn(null);
      expect(await api[fn]()).toEqual([]);
      expect(fs.getDocs).not.toHaveBeenCalled();
    },
  );
});

describe("updateAssessmentStatus", () => {
  it("writes status and reviewedAt, plus notes when given", async () => {
    await api.updateAssessmentStatus("a1", "reviewed", "called");
    expect(lastWrite(fs.updateDoc)).toEqual([
      { kind: "doc", col: "assessments", id: "a1" },
      { status: "reviewed", reviewedAt: NOW.toISOString(), counselorNotes: "called" },
    ]);
  });

  it("leaves notes out when undefined, but allows clearing them with an empty string", async () => {
    await api.updateAssessmentStatus("a1", "closed");
    expect(lastWrite(fs.updateDoc)[1]).not.toHaveProperty("counselorNotes");
    await api.updateAssessmentStatus("a1", "closed", "");
    expect(lastWrite(fs.updateDoc)[1]).toHaveProperty("counselorNotes", "");
  });
});

describe("bookAppointment", () => {
  const slot = { id: "s1", counselorId: "cou1", counselorName: "Dr. Cruz", start: "S", end: "E" };

  it("marks the slot booked, then creates a Pending Review appointment", async () => {
    const ref = await api.bookAppointment(slot);
    expect(ref).toEqual({ id: "new1" });
    expect(fs.updateDoc).toHaveBeenCalledWith({ kind: "doc", col: "availability", id: "s1" }, { isBooked: true });
    expect(lastWrite(fs.addDoc)[0]).toEqual({ kind: "collection", name: "appointments" });
    expect(lastWrite(fs.addDoc)[1]).toEqual({
      studentId: "stu1",
      studentName: "Ana Student",
      studentEmail: "ana@usa.edu.ph",
      slotId: "s1",
      counselorId: "cou1",
      counselorName: "Dr. Cruz",
      title: "Session with Dr. Cruz",
      start: "S",
      end: "E",
      status: "Pending Review",
      createdAt: NOW.toISOString(),
    });
  });

  it("prefers the profile document's name and email over the auth user's", async () => {
    fs.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ name: "Profile Name", email: "p@usa.edu.ph" }) });
    await api.bookAppointment(slot);
    expect(lastWrite(fs.addDoc)[1]).toMatchObject({ studentName: "Profile Name", studentEmail: "p@usa.edu.ph" });
  });

  it("falls back to auth data (and warns) when the profile read fails", async () => {
    fs.getDoc.mockRejectedValue(new Error("offline"));
    await api.bookAppointment(slot);
    expect(console.warn).toHaveBeenCalled();
    expect(lastWrite(fs.addDoc)[1]).toMatchObject({ studentName: "Ana Student" });
  });

  it("still creates the appointment if marking the slot fails", async () => {
    fs.updateDoc.mockRejectedValue(new Error("denied"));
    await expect(api.bookAppointment(slot)).resolves.toEqual({ id: "new1" });
    expect(fs.addDoc).toHaveBeenCalledTimes(1);
  });

  it("skips the slot update for a slot without an id and uses default counselor labels", async () => {
    await api.bookAppointment({ counselorId: "cou1", start: "S", end: "E" });
    expect(fs.updateDoc).not.toHaveBeenCalled();
    expect(lastWrite(fs.addDoc)[1]).toMatchObject({
      slotId: null,
      counselorName: "Assigned Counselor",
      title: "Session with Counselor",
    });
  });

  it("with no slot, creates a generic request dated 24h from now", async () => {
    await api.bookAppointment();
    expect(fs.updateDoc).not.toHaveBeenCalled();
    expect(lastWrite(fs.addDoc)[1]).toMatchObject({
      slotId: null,
      title: "Counseling Session",
      status: "Pending Review",
      date: new Date(NOW.getTime() + 86400000).toISOString(),
    });
  });

  it("name fallback chain: email prefix, then 'Student'", async () => {
    signIn({ uid: "u", email: "kim@usa.edu.ph" });
    await api.bookAppointment();
    expect(lastWrite(fs.addDoc)[1]).toMatchObject({ studentName: "kim", studentEmail: "kim@usa.edu.ph" });
    signIn({ uid: "u" });
    await api.bookAppointment();
    expect(lastWrite(fs.addDoc)[1]).toMatchObject({ studentName: "Student", studentEmail: "" });
  });

  it("does not read the profile when signed out (studentId is then undefined)", async () => {
    signIn(null);
    await api.bookAppointment();
    expect(fs.getDoc).not.toHaveBeenCalled();
    expect(lastWrite(fs.addDoc)[1].studentId).toBeUndefined();
  });

  it("propagates a failed appointment write", async () => {
    fs.addDoc.mockRejectedValue(new Error("quota"));
    await expect(api.bookAppointment(slot)).rejects.toThrow("quota");
  });
});

describe("getAllAppointments (staff list with enrichment)", () => {
  const run = async (appts, users = snap([["stu1", { name: "Ana Real", email: "ana@usa.edu.ph" }]])) => {
    fs.getDocs.mockResolvedValueOnce(snap(appts)).mockResolvedValueOnce(users);
    return api.getAllAppointments();
  };

  it("fills a placeholder name and a missing email from the profile", async () => {
    const [a] = await run([["p1", { studentId: "stu1", studentName: "Student", studentEmail: "" }]]);
    expect(a).toMatchObject({ id: "p1", studentName: "Ana Real", studentEmail: "ana@usa.edu.ph" });
  });

  it("keeps stored values and defaults to 'Student' / '' when nothing is known", async () => {
    const out = await run([
      ["p1", { studentId: "stu1", studentName: "Typed", studentEmail: "t@x.ph" }],
      ["p2", {}],
    ]);
    expect(out[0]).toMatchObject({ studentName: "Typed", studentEmail: "t@x.ph" });
    expect(out[1]).toMatchObject({ studentName: "Student", studentEmail: "" });
  });

  it("returns raw appointments (and warns) when the profile lookup fails", async () => {
    fs.getDocs.mockResolvedValueOnce(snap([["p1", { x: 1 }]])).mockRejectedValueOnce(new Error("denied"));
    expect(await api.getAllAppointments()).toEqual([{ id: "p1", x: 1 }]);
    expect(console.warn).toHaveBeenCalled();
  });
});

describe("updateAppointmentStatus", () => {
  it("writes status and updatedAt, merging extraData", async () => {
    await api.updateAppointmentStatus("ap1", "Confirmed", { note: "ok" });
    expect(lastWrite(fs.updateDoc)).toEqual([
      { kind: "doc", col: "appointments", id: "ap1" },
      { status: "Confirmed", updatedAt: NOW.toISOString(), note: "ok" },
    ]);
  });

  it.each(["Declined", "Cancelled"])("%s with a slotId frees that slot first", async (status) => {
    await api.updateAppointmentStatus("ap1", status, { slotId: "s1" });
    expect(fs.updateDoc.mock.calls[0]).toEqual([{ kind: "doc", col: "availability", id: "s1" }, { isBooked: false }]);
    expect(fs.updateDoc.mock.calls[1][0]).toEqual({ kind: "doc", col: "appointments", id: "ap1" });
  });

  it.each([
    ["Confirmed", { slotId: "s1" }],
    ["Declined", {}],
    ["Cancelled", { slotId: "" }],
    ["Rescheduled", { slotId: "s1" }],
  ])("%s with %j does not touch availability", async (status, extra) => {
    await api.updateAppointmentStatus("ap1", status, extra);
    expect(fs.updateDoc).toHaveBeenCalledTimes(1);
  });

  it("still updates the appointment (and warns) if freeing the slot fails", async () => {
    fs.updateDoc.mockRejectedValueOnce(new Error("denied")).mockResolvedValueOnce(undefined);
    await expect(api.updateAppointmentStatus("ap1", "Cancelled", { slotId: "s1" })).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalled();
    expect(fs.updateDoc).toHaveBeenCalledTimes(2);
  });

  it("propagates a failure of the appointment write itself", async () => {
    fs.updateDoc.mockRejectedValue(new Error("denied"));
    await expect(api.updateAppointmentStatus("ap1", "Confirmed")).rejects.toThrow("denied");
  });
});

describe("availability", () => {
  it("getAvailability lists every slot with ids", async () => {
    fs.getDocs.mockResolvedValue(
      snap([
        ["s1", { isBooked: true }],
        ["s2", { isBooked: false }],
      ]),
    );
    expect(await api.getAvailability()).toEqual([
      { id: "s1", isBooked: true },
      { id: "s2", isBooked: false },
    ]);
  });

  it("addAvailability stores an unbooked slot for the signed-in counselor", async () => {
    signIn({ uid: "cou1", displayName: "Dr. Cruz" });
    await api.addAvailability("S", "E");
    expect(lastWrite(fs.addDoc)).toEqual([
      { kind: "collection", name: "availability" },
      {
        counselorId: "cou1",
        counselorName: "Dr. Cruz",
        start: "S",
        end: "E",
        isBooked: false,
        createdAt: NOW.toISOString(),
      },
    ]);
  });

  it("addAvailability labels a nameless counselor 'Counselor'", async () => {
    signIn({ uid: "cou1" });
    await api.addAvailability("S", "E");
    expect(lastWrite(fs.addDoc)[1].counselorName).toBe("Counselor");
  });

  it("removeAvailability deletes availability/{id}", async () => {
    await api.removeAvailability("s1");
    expect(fs.deleteDoc).toHaveBeenCalledWith({ kind: "doc", col: "availability", id: "s1" });
  });

  it("removeAvailability propagates a denied delete", async () => {
    fs.deleteDoc.mockRejectedValue(Object.assign(new Error("no"), { code: "permission-denied" }));
    await expect(api.removeAvailability("s1")).rejects.toMatchObject({ code: "permission-denied" });
  });
});

describe("user settings and assignment", () => {
  it("getUserSettings returns { id, ...data } for the signed-in user by default", async () => {
    fs.getDoc.mockResolvedValue({ exists: () => true, id: "stu1", data: () => ({ name: "Ana" }) });
    expect(await api.getUserSettings()).toEqual({ id: "stu1", name: "Ana" });
    expect(fs.getDoc).toHaveBeenCalledWith({ kind: "doc", col: "users", id: "stu1" });
  });

  it("getUserSettings(uid) reads that user; a missing profile gives null", async () => {
    expect(await api.getUserSettings("other")).toBeNull();
    expect(fs.getDoc).toHaveBeenCalledWith({ kind: "doc", col: "users", id: "other" });
  });

  it("getUserSettings returns null without reading when nobody is signed in", async () => {
    signIn(null);
    expect(await api.getUserSettings()).toBeNull();
    expect(fs.getDoc).not.toHaveBeenCalled();
  });

  it("saveUserSettings updates the given or current user", async () => {
    await api.saveUserSettings(undefined, { name: "A" });
    expect(lastWrite(fs.updateDoc)).toEqual([{ kind: "doc", col: "users", id: "stu1" }, { name: "A" }]);
    await api.saveUserSettings("other", { name: "B" });
    expect(lastWrite(fs.updateDoc)[0].id).toBe("other");
  });

  it("saveUserSettings throws before writing when nobody is signed in", async () => {
    signIn(null);
    await expect(api.saveUserSettings(undefined, { a: 1 })).rejects.toThrow("No authenticated user");
    expect(fs.updateDoc).not.toHaveBeenCalled();
  });

  it("assignCounselorToStudent sets the three assignment fields", async () => {
    await api.assignCounselorToStudent("stu1", "cou1", "Dr. Cruz");
    expect(lastWrite(fs.updateDoc)).toEqual([
      { kind: "doc", col: "users", id: "stu1" },
      { assignedCounselorId: "cou1", assignedCounselorName: "Dr. Cruz", assignedAt: NOW.toISOString() },
    ]);
  });

  it.each([[null], [undefined], [""]])("assignCounselorToStudent clears everything for counselorId %j", async (id) => {
    await api.assignCounselorToStudent("stu1", id, "ignored name");
    expect(lastWrite(fs.updateDoc)[1]).toEqual({
      assignedCounselorId: null,
      assignedCounselorName: "ignored name",
      assignedAt: null,
    });
  });
});

describe("messages", () => {
  describe("sendStudentMessage", () => {
    it("stores a trimmed message with sender defaults and returns it with its id", async () => {
      const m = await api.sendStudentMessage({ studentId: "stu1", text: "  hello  " });
      expect(m).toEqual({
        id: "new1",
        studentId: "stu1",
        senderId: "stu1",
        senderName: "Student",
        senderRole: "student",
        text: "hello",
        timestamp: NOW.toISOString(),
      });
      expect(lastWrite(fs.addDoc)[0]).toEqual({ kind: "collection", name: "messages" });
    });

    it("uses an explicit sender and a role-based default name for counselors", async () => {
      const m = await api.sendStudentMessage({
        studentId: "stu1",
        senderId: "cou1",
        senderRole: "counselor",
        text: "hi",
      });
      expect(m).toMatchObject({ senderId: "cou1", senderRole: "counselor", senderName: "Counselor" });
    });

    it.each([
      ["no studentId", { text: "hi" }],
      ["empty studentId", { studentId: "", text: "hi" }],
      ["undefined text", { studentId: "s" }],
      ["empty text", { studentId: "s", text: "" }],
      ["whitespace text", { studentId: "s", text: " \n\t " }],
    ])("returns null and writes nothing for %s", async (_label, input) => {
      expect(await api.sendStudentMessage(input)).toBeNull();
      expect(fs.addDoc).not.toHaveBeenCalled();
    });

    it("propagates a failed write", async () => {
      fs.addDoc.mockRejectedValue(new Error("denied"));
      await expect(api.sendStudentMessage({ studentId: "s", text: "hi" })).rejects.toThrow("denied");
    });
  });

  describe("listenToStudentMessages", () => {
    it("subscribes to the student's thread and returns the unsubscribe function", () => {
      const unsub = vi.fn();
      fs.onSnapshot.mockReturnValue(unsub);
      expect(api.listenToStudentMessages("stu1", () => {})).toBe(unsub);
      expect(fs.onSnapshot.mock.calls[0][0]).toEqual({
        kind: "query",
        name: "messages",
        clauses: [{ field: "studentId", op: "==", value: "stu1" }],
      });
    });

    it("delivers messages oldest-first, treating a missing timestamp as the earliest", () => {
      const onUpdate = vi.fn();
      fs.onSnapshot.mockImplementation((_q, next) => {
        next(
          snap([
            ["m2", { timestamp: "2026-10-01T00:00:02.000Z" }],
            ["m0", {}],
            ["m1", { timestamp: "2026-10-01T00:00:01.000Z" }],
          ]),
        );
        return () => {};
      });
      api.listenToStudentMessages("stu1", onUpdate);
      expect(onUpdate.mock.calls[0][0].map((m) => m.id)).toEqual(["m0", "m1", "m2"]);
    });

    it("reports listener errors to onError and logs them", () => {
      const onError = vi.fn();
      const err = new Error("denied");
      fs.onSnapshot.mockImplementation((_q, _next, fail) => {
        fail(err);
        return () => {};
      });
      api.listenToStudentMessages("stu1", () => {}, onError);
      expect(onError).toHaveBeenCalledWith(err);
      expect(console.error).toHaveBeenCalled();
    });

    it("does not throw when a listener error arrives and no onError was given", () => {
      fs.onSnapshot.mockImplementation((_q, _next, fail) => {
        fail(new Error("x"));
        return () => {};
      });
      expect(() => api.listenToStudentMessages("stu1", () => {})).not.toThrow();
    });

    it.each([[""], [undefined], [null]])("returns a no-op without subscribing for studentId %j", (id) => {
      const unsub = api.listenToStudentMessages(id, () => {});
      expect(fs.onSnapshot).not.toHaveBeenCalled();
      expect(unsub()).toBeUndefined();
    });

    it("returns a no-op if subscribing throws synchronously", () => {
      fs.onSnapshot.mockImplementation(() => {
        throw new Error("bad query");
      });
      const unsub = api.listenToStudentMessages("stu1", () => {});
      expect(unsub()).toBeUndefined();
      expect(console.error).toHaveBeenCalled();
    });
  });
});

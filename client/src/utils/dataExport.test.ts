import { describe, it, expect } from "vitest";
import { buildDataExport, dataExportFileName, toPlain, type MyData } from "./dataExport";
import type { Appointment, Assessment, ChatMessage, UserProfile } from "../types";

const NOW = new Date("2026-10-03T08:30:00.000Z");

const assessment = (over: Partial<Assessment> = {}): Assessment => ({
  id: "a1",
  studentId: "s1",
  studentName: "Ana",
  studentEmail: "ana@usa.edu.ph",
  answers: [1, 0, 2],
  questionSummary: [{ id: "q1", text: "Sleep", score: 1, isCrisisItem: false }],
  total: 3,
  maxScore: 9,
  riskLevel: "medium",
  flaggedForImmediateReview: false,
  status: "reviewed",
  counselorNotes: "SECRET staff note",
  createdAt: "2026-09-20T10:00:00.000Z",
  reviewedAt: "2026-09-21T10:00:00.000Z",
  ...over,
});

const data = (over: Partial<MyData> = {}): MyData => ({
  profile: {
    id: "s1",
    name: "Ana",
    email: "ana@usa.edu.ph",
    role: "student",
    phone: "0917 123 4567",
  } as UserProfile & {
    id: string;
  },
  assessments: [assessment()],
  appointments: [
    {
      id: "p1",
      studentId: "s1",
      title: "Session",
      status: "Confirmed",
      counselorNote: "SECRET appointment note",
      declineReason: "",
    } as unknown as Appointment,
  ],
  messages: [
    {
      id: "m1",
      studentId: "s1",
      senderId: "c1",
      senderName: "Dr. Reyes",
      senderRole: "admin",
      text: "See you Friday",
      timestamp: "2026-09-22T09:00:00.000Z",
    } as ChatMessage,
  ],
  ...over,
});

describe("buildDataExport", () => {
  it("contains the person's profile, check-ins, appointments and messages", () => {
    const out = buildDataExport(data(), NOW);
    expect(out.exportedAt).toBe("2026-10-03T08:30:00.000Z");
    expect(out.profile).toMatchObject({ name: "Ana", email: "ana@usa.edu.ph", phone: "0917 123 4567" });
    expect(out.checkIns).toHaveLength(1);
    expect(out.checkIns[0]).toMatchObject({ total: 3, riskLevel: "medium", status: "reviewed" });
    expect(out.appointments[0]).toMatchObject({ title: "Session", status: "Confirmed" });
    expect(out.messages[0]).toMatchObject({ senderName: "Dr. Reyes", text: "See you Friday" });
  });

  it("leaves out notes written by guidance staff, and says so", () => {
    const out = buildDataExport(data(), NOW);
    const text = JSON.stringify(out);
    expect(text).not.toContain("SECRET");
    expect(text).not.toContain("counselorNote");
    expect(out.notIncluded).toMatch(/Notes written by guidance staff are not included/);
    expect(out.notIncluded).toContain("guidance@usa.edu.ph");
  });

  it("drops internal document ids", () => {
    const out = buildDataExport(data(), NOW);
    expect(out.profile).not.toHaveProperty("id");
    expect(out.checkIns[0]).not.toHaveProperty("id");
    expect(out.appointments[0]).not.toHaveProperty("id");
    expect(out.messages[0]).not.toHaveProperty("id");
  });

  it("handles a person with nothing yet", () => {
    const out = buildDataExport({ profile: null, assessments: [], appointments: [], messages: [] }, NOW);
    expect(out).toMatchObject({ profile: null, checkIns: [], appointments: [], messages: [] });
  });

  it("does not modify what it was given", () => {
    const input = data();
    buildDataExport(input, NOW);
    expect(input.assessments[0]?.counselorNotes).toBe("SECRET staff note");
    expect(input.profile).toHaveProperty("id", "s1");
  });

  it("round-trips through JSON", () => {
    const out = buildDataExport(data(), NOW);
    expect(JSON.parse(JSON.stringify(out))).toEqual(out);
  });
});

describe("toPlain", () => {
  it("turns Firestore-style timestamps and dates into ISO strings", () => {
    const stamp = { seconds: 1, nanoseconds: 0, toDate: () => new Date("2026-01-02T03:04:05.000Z") };
    expect(toPlain({ createdAt: stamp, when: new Date("2026-01-01T00:00:00.000Z") })).toEqual({
      createdAt: "2026-01-02T03:04:05.000Z",
      when: "2026-01-01T00:00:00.000Z",
    });
  });

  it("drops undefined, keeps null, and recurses into arrays", () => {
    expect(toPlain({ a: undefined, b: null, c: [1, undefined, { d: undefined, e: 2 }] })).toEqual({
      b: null,
      c: [1, null, { e: 2 }],
    });
  });

  it("turns an invalid timestamp into null instead of throwing", () => {
    expect(toPlain({ at: { toDate: () => new Date("nope") } })).toEqual({ at: null });
  });
});

describe("dataExportFileName", () => {
  it("is dated", () => {
    expect(dataExportFileName(NOW)).toBe("mind-bridge-my-data-2026-10-03.json");
  });
});

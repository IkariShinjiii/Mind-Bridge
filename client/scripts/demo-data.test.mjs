import { describe, expect, it } from "vitest";
import { scoreAnswers } from "../src/utils/scoring";
import { FULL_QUESTIONS } from "../src/lib/fullQuestions";
import { fullAnswersOf, quickAnswersOf, scoreWho5 } from "../src/utils/clinical";
import { buildDemoData, DEMO_DOMAIN, DEMO_PREFIX } from "./demo-data.mjs";

const NOW = new Date("2026-11-04T04:00:00.000Z"); // a Wednesday, noon in Manila
const data = buildDemoData(NOW);
const ids = (rows) => rows.map((r) => r.id);

describe("demo data", () => {
  it("is deterministic for a given time", () => {
    expect(buildDemoData(NOW)).toEqual(data);
  });

  it("marks every record and account as demo", () => {
    for (const rows of Object.values(data)) for (const r of rows) expect(r.id.startsWith(DEMO_PREFIX)).toBe(true);
    for (const u of data.users) expect(u.email.endsWith(`@${DEMO_DOMAIN}`)).toBe(true);
    for (const rows of Object.values(data)) expect(new Set(ids(rows)).size).toBe(rows.length);
  });

  it("covers every role, a pending counselor and every appointment status the app shows", () => {
    expect(data.users.filter((u) => u.role === "student")).toHaveLength(6);
    expect(data.users.some((u) => u.role === "admin")).toBe(true);
    expect(data.users.some((u) => u.role === "counselor" && u.approved)).toBe(true);
    expect(data.users.some((u) => u.role === "counselor" && !u.approved)).toBe(true);
    expect(new Set(data.appointments.map((a) => a.status))).toEqual(
      new Set(["Confirmed", "Pending Review", "Completed", "Cancelled"]),
    );
  });

  it("scores every check-in exactly as the app does", () => {
    for (const a of data.assessments) {
      const questions = a.questionSummary.map((q) => ({ id: q.id, isCrisisItem: q.isCrisisItem }));
      const expected = scoreAnswers(a.answers, questions);
      expect({
        total: a.total,
        maxScore: a.maxScore,
        riskLevel: a.riskLevel,
        flagged: a.flaggedForImmediateReview,
      }).toEqual({
        total: expected.total,
        maxScore: expected.maxScore,
        riskLevel: expected.riskLevel,
        flagged: expected.flaggedForImmediateReview,
      });
      expect(a.answers.every((v) => Number.isInteger(v) && v >= 0 && v <= 3)).toBe(true);
      // The saved questions agree with the answers, and are the 7 or 16 the dashboards know how to read
      expect(a.questionSummary.map((q) => q.score)).toEqual(a.answers);
      expect(a.answers.length === 7 ? quickAnswersOf(a) : fullAnswersOf(a)).not.toBeNull();
    }
  });

  it("uses the full check-in wording and the real safety item", () => {
    const full = data.assessments.filter((a) => a.answers.length === 16);
    expect(full.length).toBeGreaterThan(0);
    for (const a of full) {
      expect(a.questionSummary.map((q) => q.text)).toEqual(FULL_QUESTIONS.map((q) => q.text));
      expect(a.questionSummary.map((q) => q.id)).toEqual(FULL_QUESTIONS.map((q) => q.id));
    }
  });

  it("follows the check-in rules in firestore.rules (risk never below the score; counselor notes only after review)", () => {
    for (const a of data.assessments) {
      expect(a.total * 10 < a.maxScore * 6 || a.riskLevel === "high").toBe(true);
      expect(a.total * 10 < a.maxScore * 3 || a.riskLevel !== "low").toBe(true);
      if (a.counselorNotes) expect(["reviewed", "escalated"]).toContain(a.status);
    }
  });

  it("has a fresh high-risk case waiting in the triage queue, and never leaves one for the alert sweep to email", () => {
    const fresh = data.assessments.filter(
      (a) => a.riskLevel === "high" && NOW - new Date(a.createdAt) < 48 * 3_600_000,
    );
    expect(fresh.length).toBeGreaterThan(0);
    for (const a of data.assessments.filter((x) => x.riskLevel === "high")) expect(a.alertSentAt).toBeTruthy();
  });

  it("leaves only each student's latest check-in waiting, so the queue is realistic", () => {
    const open = data.assessments.filter((a) => a.status === "open");
    expect(new Set(open.map((a) => a.studentId)).size).toBe(open.length);
    expect(open.length).toBeLessThanOrEqual(6);
    for (const a of data.assessments.filter((x) => x.status !== "open")) expect(a.reviewedAt).toBeTruthy();
  });

  it("stores WHO-5 scores as the answers added up times four", () => {
    for (const w of data.wellbeing) {
      expect(w.answers).toHaveLength(5);
      expect(w.score).toBe(scoreWho5(w.answers).score);
    }
  });

  it("keeps slots, appointments and staff consistent", () => {
    const slotIds = new Set(ids(data.availability));
    const userIds = new Set(ids(data.users));
    for (const a of data.appointments) {
      expect(userIds.has(a.studentId)).toBe(true);
      expect(userIds.has(a.counselorId)).toBe(true);
      if (a.slotId) expect(slotIds.has(a.slotId)).toBe(true);
    }
    // A slot is booked exactly when an appointment holds it
    const held = new Set(data.appointments.map((a) => a.slotId).filter(Boolean));
    for (const s of data.availability) expect(s.isBooked).toBe(held.has(s.id));
    for (const m of data.messages) expect(userIds.has(m.studentId)).toBe(true);
    for (const x of [...data.assessments, ...data.wellbeing]) expect(userIds.has(x.studentId)).toBe(true);
  });

  it("offers open weekday slots in the future, in datetime-local format", () => {
    const open = data.availability.filter((s) => !s.isBooked);
    expect(open.length).toBeGreaterThan(20);
    for (const s of data.availability) {
      expect(s.start).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:00$/);
      expect(new Date(s.end) > new Date(s.start)).toBe(true);
      expect(new Date(s.start).getDay()).not.toBe(0);
      expect(new Date(s.start).getDay()).not.toBe(6);
    }
    // Upcoming appointments are in the future; past ones are in the past
    const manilaNow = new Date(NOW.getTime() + 8 * 3_600_000).toISOString().slice(0, 16);
    for (const a of data.appointments) {
      if (a.status === "Confirmed" || a.status === "Pending Review") expect(a.start > manilaNow).toBe(true);
      else expect(a.start < manilaNow).toBe(true);
    }
  });

  it("only uses sender roles the rules accept (staff speak as admin)", () => {
    for (const m of data.messages) {
      expect(["student", "admin"]).toContain(m.senderRole);
      expect(m.text.length).toBeGreaterThan(0);
    }
  });
});

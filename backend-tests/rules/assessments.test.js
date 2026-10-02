import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import { assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, collection, query, where } from "firebase/firestore";
import { createEnv, seedUsers, seed, as, anon, noProfile, assessment } from "../helpers/env.js";

let env;
beforeAll(async () => { env = await createEnv(); });
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await seedUsers(env);
  await seed(env, "assessments/a1", assessment());
  await seed(env, "assessments/a2", assessment({ studentId: "stu2", studentName: "Ben" }));
});

describe("assessments - CREATE (submitResponse)", () => {
  it("student submits own assessment with status open", () => assertSucceeds(addDoc(collection(as(env, "student"), "assessments"), assessment())));
  it("student cannot submit on behalf of another student", () => assertFails(addDoc(collection(as(env, "student"), "assessments"), assessment({ studentId: "stu2" }))));
  it("student cannot submit pre-closed (status != open)", () => assertFails(addDoc(collection(as(env, "student"), "assessments"), assessment({ status: "reviewed" }))));
  it("the 'anonymous' fallback studentId is rejected", () => assertFails(addDoc(collection(as(env, "student"), "assessments"), assessment({ studentId: "anonymous" }))));
  it("unauthenticated submit is rejected", () => assertFails(addDoc(collection(anon(env), "assessments"), assessment())));
  it("signed-in user without a profile is rejected", () => assertFails(addDoc(collection(noProfile(env), "assessments"), assessment({ studentId: "ghost" }))));
  it("deactivated student is rejected", () => assertFails(addDoc(collection(as(env, "deactivated"), "assessments"), assessment({ studentId: "stu3" }))));
});

describe("assessments - READ (getMyAssessments, getAssessments)", () => {
  it("student reads own via filtered query", () =>
    assertSucceeds(getDocs(query(collection(as(env, "student"), "assessments"), where("studentId", "==", "stu1")))));
  it("student reads own doc by id", () => assertSucceeds(getDoc(doc(as(env, "student"), "assessments/a1"))));
  it("student cannot read someone else's doc", () => assertFails(getDoc(doc(as(env, "student"), "assessments/a2"))));
  it("student cannot run the unfiltered list used by getAssessments", () => assertFails(getDocs(collection(as(env, "student"), "assessments"))));
  it("approved counselor lists everything", () => assertSucceeds(getDocs(collection(as(env, "counselor"), "assessments"))));
  it("admin lists everything", () => assertSucceeds(getDocs(collection(as(env, "admin"), "assessments"))));
  it("unapproved counselor cannot list", () => assertFails(getDocs(collection(as(env, "pendingCounselor"), "assessments"))));
  it("unauthenticated list is rejected", () => assertFails(getDocs(collection(anon(env), "assessments"))));
});

describe("assessments - UPDATE (updateAssessmentStatus)", () => {
  const patch = { status: "reviewed", reviewedAt: "2026-10-02T00:00:00.000Z", counselorNotes: "followed up" };
  it("counselor reviews an assessment", () => assertSucceeds(updateDoc(doc(as(env, "counselor"), "assessments/a1"), patch)));
  it("admin reviews an assessment", () => assertSucceeds(updateDoc(doc(as(env, "admin"), "assessments/a1"), patch)));
  it("student cannot edit even their own assessment", () => assertFails(updateDoc(doc(as(env, "student"), "assessments/a1"), { riskLevel: "low", counselorNotes: "x" })));
  it("unapproved counselor cannot review", () => assertFails(updateDoc(doc(as(env, "pendingCounselor"), "assessments/a1"), patch)));

  it("staff can move a case through every status", async () => {
    for (const status of ["reviewed", "escalated", "open"]) {
      await assertSucceeds(updateDoc(doc(as(env, "counselor"), "assessments/a1"), { status, reviewedAt: "2026-10-02T00:00:00.000Z" }));
    }
  });
  it("staff can save notes on their own", () =>
    assertSucceeds(updateDoc(doc(as(env, "counselor"), "assessments/a1"), { counselorNotes: "called the student" })));
  it("staff cannot change what the student submitted: score, risk, answers, flag or owner", async () => {
    const ref = () => doc(as(env, "admin"), "assessments/a1");
    await assertFails(updateDoc(ref(), { riskLevel: "high" }));
    await assertFails(updateDoc(ref(), { total: 9 }));
    await assertFails(updateDoc(ref(), { answers: [3, 3, 3] }));
    await assertFails(updateDoc(ref(), { flaggedForImmediateReview: true }));
    await assertFails(updateDoc(ref(), { studentId: "stu2" }));
  });
  it("a valid review cannot smuggle in a changed field", () =>
    assertFails(updateDoc(doc(as(env, "counselor"), "assessments/a1"), { ...patch, riskLevel: "high" })));
  it("staff cannot set a status the app does not use", () =>
    assertFails(updateDoc(doc(as(env, "counselor"), "assessments/a1"), { status: "deleted" })));
});

describe("assessments - DELETE", () => {
  it("nobody can delete", async () => {
    await assertFails(deleteDoc(doc(as(env, "admin"), "assessments/a1")));
    await assertFails(deleteDoc(doc(as(env, "student"), "assessments/a1")));
  });
});

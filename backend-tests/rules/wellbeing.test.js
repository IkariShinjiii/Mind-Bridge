import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import { assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, collection, query, where } from "firebase/firestore";
import { createEnv, seedUsers, seed, as, anon, noProfile } from "../helpers/env.js";

let env;
beforeAll(async () => { env = await createEnv(); });
afterAll(async () => { await env.cleanup(); });

const entry = (over = {}) => ({
  studentId: "stu1", answers: [3, 3, 3, 3, 3], score: 60, createdAt: "2026-10-01T00:00:00.000Z", ...over,
});

beforeEach(async () => {
  await env.clearFirestore();
  await seedUsers(env);
  await seed(env, "wellbeing/w1", entry());
  await seed(env, "wellbeing/w2", entry({ studentId: "stu2" }));
});

describe("wellbeing - CREATE (submitWellbeing)", () => {
  const submit = (who, over) => addDoc(collection(as(env, who), "wellbeing"), entry(over));

  it("a student saves their own entry", () => assertSucceeds(submit("student")));
  it("a student cannot save one for another student", () => assertFails(submit("student", { studentId: "stu2" })));
  it("unauthenticated, profile-less and deactivated users are refused", async () => {
    await assertFails(addDoc(collection(anon(env), "wellbeing"), entry()));
    await assertFails(addDoc(collection(noProfile(env), "wellbeing"), entry({ studentId: "ghost" })));
    await assertFails(submit("deactivated", { studentId: "stu3" }));
  });
  it("the score must be exactly the answers added up and multiplied by 4", async () => {
    await assertSucceeds(submit("student", { answers: [5, 5, 5, 5, 5], score: 100 }));
    await assertSucceeds(submit("student", { answers: [0, 0, 0, 0, 0], score: 0 }));
    await assertFails(submit("student", { score: 61 }));
    await assertFails(submit("student", { answers: [0, 0, 0, 0, 0], score: 100 }));
  });
  it("five answers, each a whole number from 0 to 5", async () => {
    await assertFails(submit("student", { answers: [3, 3, 3, 3], score: 48 }));
    await assertFails(submit("student", { answers: [3, 3, 3, 3, 3, 3], score: 72 }));
    await assertFails(submit("student", { answers: [6, 0, 0, 0, 0], score: 24 }));
    await assertFails(submit("student", { answers: [-1, 5, 0, 0, 0], score: 16 }));
    await assertFails(submit("student", { answers: [1.5, 1.5, 0, 0, 0], score: 12 }));
  });
  it("extra fields and a missing date are refused", async () => {
    await assertFails(submit("student", { riskLevel: "low" }));
    await assertFails(submit("student", { createdAt: 5 }));
  });
});

describe("wellbeing - READ", () => {
  it("a student reads their own entry but not another student's", async () => {
    await assertSucceeds(getDoc(doc(as(env, "student"), "wellbeing/w1")));
    await assertFails(getDoc(doc(as(env, "student"), "wellbeing/w2")));
  });
  it("a student can list their own entries by studentId", () =>
    assertSucceeds(getDocs(query(collection(as(env, "student"), "wellbeing"), where("studentId", "==", "stu1")))));
  it("a student cannot list everyone's entries", () => assertFails(getDocs(collection(as(env, "student"), "wellbeing"))));
  it("approved staff read any student's entries; unapproved counselors do not", async () => {
    await assertSucceeds(getDoc(doc(as(env, "counselor"), "wellbeing/w2")));
    await assertFails(getDoc(doc(as(env, "pendingCounselor"), "wellbeing/w2")));
  });
  it("anonymous users read nothing", () => assertFails(getDoc(doc(anon(env), "wellbeing/w1"))));
});

describe("wellbeing - entries are permanent records", () => {
  it("nobody edits or deletes an entry, not even the owner or staff", async () => {
    await assertFails(updateDoc(doc(as(env, "student"), "wellbeing/w1"), { score: 100 }));
    await assertFails(updateDoc(doc(as(env, "counselor"), "wellbeing/w1"), { score: 100 }));
    await assertFails(deleteDoc(doc(as(env, "student"), "wellbeing/w1")));
    await assertFails(deleteDoc(doc(as(env, "counselor"), "wellbeing/w1")));
  });
});
